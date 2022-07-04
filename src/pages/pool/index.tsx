import React from 'react'
import { Input } from '../../components'

export interface PoolProps {
  setLoading: React.Dispatch<React.SetStateAction<boolean>>
}

export const Pool = (props: PoolProps) => {
  const [amount, setAmount] = React.useState('')
  const [info, setInfo] = React.useState(0)



  return (
    <div className='form-container'>
      <div className='form-content-container'>
        <Input
          value={amount}
          className='amount-input number'
          placeholder='0.0'
          onChange={(event: any) => {}}
        />
        <Input
          value={amount}
          className='amount-input number'
          placeholder='0.0'
          onChange={(event: any) => {}}
        />
      </div>
    </div>
  )
}
