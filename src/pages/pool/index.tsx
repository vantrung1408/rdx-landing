import React from 'react'
import ethIcon from '../../img/eth.png'
import usdcIcon from '../../img/usdc.png'
import plusIcon from '../../img/plus.png'
import { AmountInput, Button } from '../../components'
import { BigNumber } from 'ethers'
import './index.css'
import { WalletStatus } from '../../components/wallet-status'

export interface PoolProps {
  setLoading: React.Dispatch<React.SetStateAction<boolean>>
}

export const Pool = (props: PoolProps) => {
  const [amount, setAmount] = React.useState('')
  const [info, setInfo] = React.useState(0)

  const supply = () => {}

  return (
    <div className='pool form-container'>
      <div className='form-content-container'>
        <WalletStatus callback={async () => {}} />
        <div className='pool-amount-input'>
          <AmountInput
            balance={BigNumber.from(100000)}
            decimals={BigNumber.from(100000)}
            token={{ name: 'WETH', logo: ethIcon }}
            value={amount}
            placeholder='0.0'
            onChange={(value) => {}}
            style={{ marginBottom: 0 }}
            showBalanceInfo
          />
          <img className='plus-icon' src={plusIcon} />
        </div>
        <AmountInput
          balance={BigNumber.from(100000)}
          decimals={BigNumber.from(100000)}
          token={{ name: 'USDC', logo: usdcIcon }}
          value={amount}
          placeholder='0.0'
          onChange={(value) => {}}
          showBalanceInfo
        />
        <div className='rate-container'>
          <label className='rate-info'>Rate</label>
          <label className='rate-info'>
            <label className='number'>1</label> WETH ={' '}
            <label className='number'>1000</label> USDC
          </label>
        </div>
        <Button type='button' value='Approve WETH' onClick={supply} />
        <Button type='button' value='Approve USDC' onClick={supply} />
        <Button type='button' value='Supply' onClick={supply} disabled={true} />
      </div>
    </div>
  )
}
