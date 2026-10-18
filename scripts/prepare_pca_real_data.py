"""Rebuild the public aggregate PCA results from official individual survey files.

Run: python -m pip install -r scripts/requirements-pca.txt
     python scripts/prepare_pca_real_data.py
Raw downloads stay in .cache/pca. Sampling assets contain only the selected
measurements/scores, without identifiers, weights or other survey attributes.
"""
from pathlib import Path
from urllib.request import urlopen
import hashlib
import json
import sys
import zipfile

ROOT = Path(__file__).resolve().parents[1]
CACHE = ROOT / '.cache/pca'
CACHE.mkdir(parents=True, exist_ok=True)
sys.path.insert(0, str(CACHE / 'python-deps'))
import numpy as np
import pandas as pd
import pyreadstat

OUT = ROOT / 'public/data/pca'
OUT.mkdir(parents=True, exist_ok=True)
INCA_URL = 'https://static.data.gouv.fr/resources/donnees-de-consommations-et-habitudes-alimentaires-de-letude-inca-3/20191217-184957/description-indiv.csv'
PISA_URL = 'https://webfs.oecd.org/pisa2022/STU_QQQ_SPSS.zip'
SAMPLING = OUT / 'samples'
SAMPLING.mkdir(parents=True, exist_ok=True)
sampling_manifest = {}


def download(url, name):
    path = CACHE / name
    if not path.exists():
        part = path.with_suffix(path.suffix + '.part')
        with urlopen(url, timeout=120) as source, part.open('wb') as target:
            while chunk := source.read(2**20):
                target.write(chunk)
        part.replace(path)
    return path


def sha256(path):
    with path.open('rb') as stream:
        return hashlib.file_digest(stream, 'sha256').hexdigest()


def moments(x, w):
    w = w / w.sum()
    mean = np.sum(w[:, None] * x, axis=0)
    centered = x - mean
    cov = (centered * w[:, None]).T @ centered
    sd = np.sqrt(np.diag(cov))
    r = cov / np.outer(sd, sd)
    return mean, sd, r, centered / sd


def sampling_assets(identifier, samples):
    """Export survey precision. Row order is shared across plausible values."""
    files = []
    for i, sample in enumerate(samples):
        if identifier == 'inca3':
            # The CSV preserves Float32 artefacts, e.g. 71.80000305175781 kg.
            # All retained values are within 0.00002 of their recorded tenth.
            rounded = np.round(sample, 1)
            assert np.allclose(rounded, sample, rtol=0, atol=2e-5)
            sample = rounded
        scaled = np.rint(sample * 1000)
        assert np.allclose(scaled / 1000, sample, rtol=0, atol=1e-9)
        assert np.all(np.isfinite(scaled))
        assert np.max(np.abs(scaled)) < np.iinfo(np.int32).max
        name = f'{identifier}-{i + 1}.i32'
        (SAMPLING / name).write_bytes(scaled.astype('<i4').tobytes(order='C'))
        files.append(name)
    sampling_manifest[identifier] = {
        'count': len(samples[0]), 'columns': samples[0].shape[1],
        'scale': 1000, 'encoding': 'int32-le', 'files': files,
    }


def aggregate(metadata, samples, weights):
    sampling_assets(metadata['id'], samples)
    # Each PISA plausible value is analysed separately, never averaged per pupil.
    stats = [moments(x, weights) for x in samples]
    r = np.mean([s[2] for s in stats], axis=0)
    values, vectors = np.linalg.eigh(r)
    values, vectors = values[::-1], vectors[:, ::-1].T
    for vector in vectors:
        if vector[np.argmax(np.abs(vector))] < 0:
            vector *= -1
    variance = values / values.sum()
    projections = [s[3] @ vectors[:2].T for s in stats]
    low = np.min([p.min(axis=0) for p in projections], axis=0)
    high = np.max([p.max(axis=0) for p in projections], axis=0)
    # Every observation contributes, including the extremes. No sampling/clipping.
    bounds = [[float(low[i] - .01), float(high[i] + .01)] for i in range(2)]
    count = len(weights)
    mass = weights / weights.sum() * count / len(samples)
    density = sum(np.histogram2d(p[:, 0], p[:, 1], bins=56, range=bounds, weights=mass)[0]
                  for p in projections)
    assert np.allclose(np.diag(r), 1)
    assert np.allclose(r, r.T)
    assert np.all(values >= -1e-10)
    assert np.allclose(vectors @ vectors.T, np.eye(len(values)))
    assert np.allclose(vectors.T @ np.diag(values) @ vectors, r)
    assert np.isclose(variance.sum(), 1)
    assert np.isclose(density.sum(), count)
    result = {**metadata, 'sampleSize': count,
              'means': np.mean([s[0] for s in stats], axis=0).tolist(),
              'standardDeviations': np.mean([s[1] for s in stats], axis=0).tolist(),
              'correlationMatrix': r.tolist(), 'eigenvalues': values.tolist(),
              'eigenvectors': vectors.tolist(), 'varianceExplained': variance.tolist(),
              'cumulativeVariance': np.cumsum(variance).tolist(),
              'density': {'bounds': bounds, 'counts': density.round(8).tolist()}}
    (OUT / f"{metadata['id']}.json").write_text(
        json.dumps(result, ensure_ascii=False, indent=2, allow_nan=False) + '\n', encoding='utf8')
    print(metadata['id'], 'N =', count, 'R =', r.round(6).tolist(),
          'variance =', (100 * variance).round(3).tolist(), flush=True)


def inca():
    path = download(INCA_URL, 'description-indiv.csv')
    columns = ['NOIND', 'ech', 'pop1', 'taille', 'poids', 'taille_m', 'poids_m', 'pond_indiv_adu_pop1']
    df = pd.read_csv(path, sep=';', encoding='latin1', na_values=['.'], usecols=columns)
    assert df.NOIND.is_unique
    adults = df.loc[(df.ech == 1) & (df.pop1 == 1)].copy()
    fields = ['taille', 'poids', 'pond_indiv_adu_pop1']
    valid = np.isfinite(adults[fields]).all(axis=1) & (adults[fields] > 0).all(axis=1)
    retained = adults.loc[valid]
    measured = int(retained[['taille_m', 'poids_m']].notna().all(axis=1).sum())
    aggregate({
        'id': 'inca3', 'title': 'INCA3 · France',
        'population': 'Adultes de 18 à 79 ans · France métropolitaine hors Corse · 2014–2015',
        'variableNames': ['Taille (cm)', 'Poids (kg)'],
        'method': 'ACP centrée réduite, pondérée par les poids individuels de l’enquête.',
        'axisInterpretations': [
            'CP1 associe une taille et un poids élevés : c’est la variation commune des deux mesures standardisées.',
            'CP2 oppose la taille au poids : du côté positif, la taille standardisée est plus élevée que le poids standardisé. Cet axe n’est pas un IMC.'
        ],
        'details': [
            'INCA3 est une enquête transversale de l’Anses sur l’alimentation, les comportements et les caractéristiques des personnes vivant en France. Réalisée de février 2014 à septembre 2015, elle comprend 5 855 participants : 2 698 enfants et 3 157 adultes.',
            'La sélection aléatoire comporte trois degrés (zones géographiques, logements, individus), à partir du recensement de 2011 et avec stratification géographique. Les échantillons enfants et adultes sont indépendants. Le redressement individuel tient compte de caractéristiques géographiques et socio-économiques ; ses poids sont utilisés dans tous les calculs présentés.',
            f'Tous les adultes ayant une taille, un poids et une pondération valides sont retenus : {len(retained)} sur {len(adults)}. Taille et poids finaux de l’enquête : mesures à domicile, complétées par les déclarations en cas de refus. Les deux mesures sont disponibles pour {measured} adultes retenus.',
            'Pondération : pond_indiv_adu_pop1. N désigne des personnes enquêtées, pas la population représentée. Les enfants sont exclus pour comparer des tailles et poids adultes.',
            'La projection utilise tous les individus, regroupés en cellules de densité pondérée. Les résultats sont descriptifs, sans intervalle d’incertitude.'
        ],
        'sources': [
            {'label': 'Anses · données individuelles INCA3', 'url': 'https://www.data.gouv.fr/datasets/donnees-de-consommations-et-habitudes-alimentaires-de-letude-inca-3'},
            {'label': 'Notice de l’enquête', 'url': 'https://static.data.gouv.fr/resources/donnees-de-consommations-et-habitudes-alimentaires-de-letude-inca-3/20210128-192017/notice-utilisateurs-donnees-inca3-data.gouvjanv21.pdf'}
        ],
        'audit': {'sourceRows': len(df), 'adultRows': len(adults), 'excludedIncomplete': int((~valid).sum()),
                  'measuredPairs': measured, 'sha256': sha256(path), 'url': INCA_URL}
    }, [retained[['taille', 'poids']].to_numpy()], retained.pond_indiv_adu_pop1.to_numpy())


def pisa():
    archive = download(PISA_URL, 'STU_QQQ_SPSS.zip')
    with zipfile.ZipFile(archive) as z:
        names = [n for n in z.namelist() if n.lower().endswith('.sav')]
        assert len(names) == 1, names
        path = CACHE / Path(names[0]).name
        if not path.exists():
            print('Extracting PISA student file', flush=True)
            with z.open(names[0]) as source, path.open('wb') as target:
                while chunk := source.read(2**20):
                    target.write(chunk)
    pv = [f'PV{i}{domain}' for i in range(1, 11) for domain in ['MATH', 'SCIE', 'READ']]
    columns = ['CNT', 'CNTSTUID', 'W_FSTUWT', *pv]
    print('Reading PISA selected variables', flush=True)
    df, _ = pyreadstat.read_sav(str(path), usecols=columns)
    assert not df.duplicated(['CNT', 'CNTSTUID']).any()
    valid = np.isfinite(df[['W_FSTUWT', *pv]]).all(axis=1) & (df.W_FSTUWT > 0)
    retained = df.loc[valid]
    countries = int(retained.CNT.nunique())
    samples = [retained[[f'PV{i}{d}' for d in ['MATH', 'SCIE', 'READ']]].to_numpy() for i in range(1, 11)]
    aggregate({
        'id': 'pisa2022', 'title': 'PISA 2022 · ensemble international',
        'population': f'Élèves de 15 ans · {countries} pays et économies participants · 2022',
        'variableNames': ['Mathématiques', 'Sciences', 'Compréhension de l’écrit'],
        'method': 'ACP des corrélations pondérées, calculées séparément pour les 10 valeurs plausibles puis moyennées.',
        'axisInterpretations': [
            'CP1 associe positivement les trois domaines avec des coefficients proches : elle résume leur niveau de performance commun.',
            'CP2 oppose surtout la compréhension de l’écrit aux mathématiques et aux sciences.',
            'CP3 oppose principalement les sciences aux mathématiques. La compréhension de l’écrit contribue peu à cet axe.'
        ],
        'details': [
            f'Tous les pays et économies du fichier international élèves sont inclus : {len(retained):_} élèves retenus sur {len(df):_}, avec une pondération finale positive et les 30 valeurs plausibles renseignées.'.replace('_', ' '),
            'Les scores sont ceux des évaluations PISA, pas des notes scolaires sur 20. Sciences et compréhension de l’écrit correspondent aux domaines réellement évalués.',
            'Pondération : W_FSTUWT. Les pays contribuent selon la population d’élèves représentée. Cette corrélation internationale réunit les différences au sein des pays et entre pays ; ce n’est ni une moyenne des corrélations nationales ni une estimation propre à la France.',
            'Une matrice R est estimée pour chacune des 10 valeurs plausibles avec les poids finaux ; leur moyenne est diagonalisée. On ne remplace pas les valeurs plausibles par un score moyen par élève. Les axes résument cette matrice moyenne.',
            'Pour la projection, chaque jeu de valeurs plausibles est centré et réduit séparément, puis projeté sur les mêmes axes. Les 10 densités pondérées sont moyennées. N compte chaque élève une seule fois.',
            'Résultats descriptifs : les poids de réplication ne sont pas utilisés pour estimer des erreurs types. Les limitations de participation et de couverture du rapport PISA restent applicables.'
        ],
        'sources': [
            {'label': 'OCDE · base PISA 2022', 'url': 'https://www.oecd.org/en/data/datasets/pisa-2022-database.html'},
            {'label': 'OCDE · méthode d’analyse', 'url': 'https://www.oecd.org/en/about/programmes/pisa/how-to-prepare-and-analyse-the-pisa-database.html'}
        ],
        'audit': {'sourceRows': len(df), 'excludedIncomplete': int((~valid).sum()), 'countryCount': countries,
                  'plausibleValues': 10, 'sha256': sha256(archive), 'url': PISA_URL}
    }, samples, retained.W_FSTUWT.to_numpy())


if __name__ == '__main__':
    inca()
    pisa()
    (SAMPLING / 'manifest.json').write_text(
        json.dumps(sampling_manifest, indent=2) + '\n', encoding='utf8')
