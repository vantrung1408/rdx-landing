import React from 'react'
import './Reset.css'
import './App.css'
import loadingIcon from './img/loading.gif'
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import { Routes, Route, useLocation } from 'react-router-dom'
import { Farm, Pool } from './pages'

function App() {
  const [loading, setLoading] = React.useState(false)
  const location = useLocation()
  const routes = [
    {
      title: 'Swap',
      link: '/',
      element: <></>,
    },
    {
      title: 'Farm',
      link: '/farm',
      element: <Farm setLoading={setLoading} />,
    },
    {
      title: 'Pool',
      link: '/pool',
      element: <Pool setLoading={setLoading} />,
    },
  ]

  return (
    <>
      <div className='routes-container'>
        <div className='routes'>
          {routes.map(({ title, link }) => (
            <a key={link} className={link === location.pathname ? 'route active' : 'route'} href={link}>
              {title}
            </a>
          ))}
        </div>
      </div>
      <Routes>
        {routes.map(({ link, element }) => (
          <Route key={link} path={link} element={element} />
        ))}
      </Routes>
      {loading && (
        <div className='loading-container'>
          <img className='loading' src={loadingIcon} />
          <label className='notify'>just a second...</label>
        </div>
      )}
      <ToastContainer />
    </>
  )
}

export default App
