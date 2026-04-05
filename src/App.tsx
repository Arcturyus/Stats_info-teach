import { Outlet } from 'react-router-dom';
import Header from './components/Layout/Header';
import './App.css';

function App() {
  return (
    <>
      <Header />
      <main className="main-content">
        <Outlet />
      </main>
    </>
  );
}

export default App;
