# ACP sur les données individuelles

Les dix lignes éditables proviennent désormais d’un tirage aléatoire dans les données individuelles officielles. Les étapes 4, 5 et 6 affichent ensuite les résultats calculés sur les enquêtes complètes. Ces résultats fixes sont indépendants du tirage et des modifications du tableau.

## Reproduction

```powershell
python -m pip install -r scripts/requirements-pca.txt
python scripts/prepare_pca_real_data.py
```

Le script télécharge les fichiers dans `.cache/pca` (ignoré par Git). Le fichier élèves PISA compressé représente environ 682 Mo et son extraction nécessite plusieurs Go libres. `public/data/pca/inca3.json` et `pisa2022.json` contiennent les résultats agrégés. Chaque sortie conserve l’URL, le SHA-256 de la source et les effectifs exclus.

## Tirage interactif

Les fichiers de `public/data/pca/samples/` contiennent uniquement les deux mesures INCA3 ou les trois scores PISA nécessaires au tableau. Aucun identifiant, pays, poids d’enquête ou autre attribut individuel n’est embarqué. Les valeurs sont stockées en Int32 little endian, multipliées par 1 000. Les mesures INCA3 sont rétablies au dixième (25 152 octets) : toutes les valeurs du CSV sont à moins de 0,00002 de ce dixième ; ceci retire les artefacts de représentation Float32 tels que 71,800003 kg. Les trois décimales des scores PISA sont conservées exactement, vérification faite lors de l’export. Chaque fichier PISA représente 7 364 928 octets ; seul celui de la valeur plausible choisie est chargé. Le manifeste décrit l’effectif, l’encodage et les dimensions.

À l’ouverture de la page, au changement d’enquête et à chaque clic sur « Piocher 10 personnes au hasard », dix indices distincts sont tirés uniformément parmi les 3 144 adultes ou 613 744 élèves retenus. Le générateur est `crypto.getRandomValues`, sans graine fournie par l’application ni persistance d’un tirage. Le rejet des entiers excédentaires évite le biais du modulo. Deux personnes ayant les mêmes mesures restent deux observations différentes ; aucune sélection ne force une corrélation particulière. Les dix observations sont équipondérées pour la démonstration.

PISA : on tire uniformément un numéro entre 1 et 10 pour choisir un jeu officiel de valeurs plausibles, commun aux dix élèves et aux trois domaines. On ne combine pas les domaines de jeux différents et on ne calcule pas de moyenne individuelle des dix estimations. Le numéro du jeu est indiqué dans l’interface ; les valeurs sont des points PISA, pas des notes sur 20. Trois fichiers au maximum sont conservés en mémoire. Les échecs de chargement peuvent être relancés par le bouton, sans revenir à des données fictives. Les lignes restent éditables ; une modification est signalée près de la source.

## Sources et populations

- **INCA3, Anses** : [fichier individuel et documentation](https://www.data.gouv.fr/datasets/donnees-de-consommations-et-habitudes-alimentaires-de-letude-inca-3), [notice d’utilisation](https://static.data.gouv.fr/resources/donnees-de-consommations-et-habitudes-alimentaires-de-letude-inca-3/20210128-192017/notice-utilisateurs-donnees-inca3-data.gouvjanv21.pdf). Adultes de 18–79 ans, France métropolitaine hors Corse, enquête 2014–2015. Parmi les 3 157 adultes, 3 144 ont une taille, un poids et un poids d’enquête valides ; les 13 autres sont exclus. Variables finales `taille`, `poids` (mesurées ou déclarées selon le protocole). Poids `pond_indiv_adu_pop1`. La présentation de l’enquête et du redressement figure dans « Sources et méthode de calcul » du site.
- **PISA 2022, OCDE** : [base officielle](https://www.oecd.org/en/data/datasets/pisa-2022-database.html), [archive élèves SPSS](https://webfs.oecd.org/pisa2022/STU_QQQ_SPSS.zip), [consignes d’analyse](https://www.oecd.org/en/about/programmes/pisa/how-to-prepare-and-analyse-the-pisa-database.html). Le fichier international téléchargé comporte 613 744 élèves et 80 codes pays/économies distincts. Tous ont les 30 valeurs plausibles et un poids `W_FSTUWT` positif : aucune exclusion supplémentaire. Les trois domaines sont mathématiques, sciences, compréhension de l’écrit. Il s’agit des effectifs du fichier public utilisé, pas d’un effectif annoncé pour l’enquête entière.

## Calcul

Pour chaque jeu X et les poids normalisés a = w / somme(w) : moyenne μ = somme(aX), covariance C = (X−μ)ᵀ diag(a) (X−μ), écarts types s = racine(diag(C)), puis Rᵢⱼ = Cᵢⱼ / (sᵢsⱼ). L’ACP est donc centrée et réduite, sur la corrélation pondérée.

Pour PISA, ce calcul est répété séparément sur PV1 à PV10. R est la moyenne des dix matrices de corrélation, puis cette matrice est diagonalisée. Ce choix décrit les axes de la corrélation moyenne ; il ne prétend pas être une procédure d’inférence officielle OCDE pour l’ACP. Aucun score individuel moyen des dix valeurs plausibles n’est utilisé. Les poids finaux donnent davantage de contribution aux populations d’élèves plus nombreuses : ce résultat international combine variations entre pays et au sein des pays. Il ne représente pas la moyenne OCDE des corrélations nationales.

Les valeurs propres sont triées par ordre décroissant ; les vecteurs propres unitaires sont stockés en lignes. Le coefficient de plus grande valeur absolue est orienté positivement pour fixer le signe. Les parts de variance sont λ / somme(λ). Les interprétations sont descriptives, sans conclusion causale. Aucun intervalle de confiance ou test de significativité n’est fourni : les poids de réplication ne sont pas exploités ici.

La projection utilise tous les individus : grille de densité 56 × 56 sur CP1 et CP2, avec étendue complète des scores. Chaque observation contribue selon son poids, sans sous-échantillonnage ni suppression des extrêmes. PISA : centrage/réduction séparés pour chaque valeur plausible, projection sur les axes communs de R moyen, puis moyenne des dix densités. La masse est ramenée à N pour le stockage et convertie en pourcentages dans le graphique ; N ne compte jamais un élève dix fois.

## Contrôles

Le script vérifie l’unicité des identifiants, la symétrie et la diagonale de R, la positivité des valeurs propres, l’orthonormalité des axes, la reconstruction de R, la somme des parts de variance et la conservation de la masse de la projection. Les moyennes INCA3 obtenues (168,764 cm et 73,618 kg) concordent avec les arrondis du rapport Anses (168,8 cm et 73,6 kg).

Résultats de référence : INCA3 r = 0,476964, CP1 = 73,8482 %. PISA r maths/sciences = 0,891427, maths/écrit = 0,843779, sciences/écrit = 0,853090 ; CP1 = 90,8566 %, CP1+CP2 = 96,3980 %.
