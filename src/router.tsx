import { createBrowserRouter } from 'react-router-dom';
import App from './App';

const router = createBrowserRouter([
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
    ],
  },
]);

export default router;
