import React from 'react'
import './index.css'

export const Input = function ({ title, ...inputProps }: any) {
  return (
    <div className='input-container'>
      {title && <label className='input-label'>{title}</label>}
      <input className='input' {...inputProps} />
    </div>
  )
}
