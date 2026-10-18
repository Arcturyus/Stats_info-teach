import { createBrowserRouter } from 'react-router-dom';
import App from './App';

const router = createBrowserRouter(
  [
    {
      path: '/',
      element: <App />,
      children: [
        {
          index: true,
          lazy: () => import('./pages/HomePage'),
        },
        {
          path: 'pca',
          lazy: () => import('./concepts/pca/PcaPage'),
        },
        {
          path: 'entropy',
          lazy: () => import('./concepts/entropy/EntropyPage'),
        },
        {
          path: 'causalite',
          lazy: () => import('./concepts/causal/CausalPage'),
        },
      ],
    },
  ],
  { basename: import.meta.env.BASE_URL },
);

export default router;
