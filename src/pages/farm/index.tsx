import React from 'react'
import './index.css'
import { ethers, BigNumber, Signer, utils, constants } from 'ethers'
import { AmountInput, Button, Tab, Tabs } from '../../components'
import { RDL, RDX, CHEF } from '../../contracts'
import { toast } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import {
  formatCurrency,
  getAccount,
  requestSigner,
  switchToCorrectNetwork,
} from '../../utils/wallet'
import { FormItem } from '../../utils/type'
import { WalletStatus } from '../../components/wallet-status'

const DECIMAL_PRECISION = 12
const DECIMAL_PRECISION_IN_UNIT = utils.parseUnits('1', DECIMAL_PRECISION)

export interface FarmProps {
  setLoading: React.Dispatch<React.SetStateAction<boolean>>
}

export const Farm = (props: FarmProps) => {
  const [info, setInfo] = React.useState({
    rdl: BigNumber.from(0),
    rdx: BigNumber.from(0),
    deposited: BigNumber.from(0),
    address: '',
    reward: BigNumber.from(0),
    rdlDecimals: BigNumber.from(0),
    rdxDecimals: BigNumber.from(0),
    needApprove: false,
  })
  const [stake, setStake] = React.useState<FormItem>({
    value: '',
    valid: false,
    title: 'Stake',
  })
  const [unStake, setUnStake] = React.useState<FormItem>({
    value: '',
    valid: false,
    title: 'Unstake',
  })

  React.useEffect(() => {
    initState()
  }, [])

  const initState = async () => {
    const connected = await getAccount()
    if (!!connected) {
      await loadInfo(true)
    }
    window.ethereum.removeListener('accountsChanged', loadInfo)
    window.ethereum.removeListener('chainChanged', loadInfo)
    window.ethereum.on('accountsChanged', loadInfo)
    window.ethereum.on('chainChanged', loadInfo)
  }

  const getChef = async () => {
    const signer = await requestSigner()
    const chef = new ethers.Contract(CHEF.address, CHEF.abi, signer)
    return chef
  }

  const getRDL = async () => {
    const signer = await requestSigner()
    const rdl = new ethers.Contract(RDL.address, RDL.abi, signer)
    return rdl
  }

  const getRDX = async () => {
    const signer = await requestSigner()
    const rdx = new ethers.Contract(RDX.address, RDX.abi, signer)
    return rdx
  }

  const loadInfo = async (forceSwitchNetwork: boolean) => {
    try {
      props.setLoading(true)
      if (forceSwitchNetwork) {
        await switchToCorrectNetwork()
      }

      const signer = await requestSigner()
      const address = await signer.getAddress()
      //
      const rdl = await getRDL()
      const rdlDecimals: BigNumber = await rdl.decimals()
      const rdlBalance: BigNumber = await rdl.balanceOf(address)
      //
      const rdx = await getRDX()
      const rdxDecimals: BigNumber = await rdl.decimals()
      const rdxBalance: BigNumber = await rdx.balanceOf(address)
      //
      const chef = await getChef()
      const deposited = (await chef.users(address)).balance
      const pendingReward = await chef.rewardAmount()
      // const pendingReward = BigNumber.from(0)

      // approve
      const allowance: BigNumber = await rdl.allowance(address, chef.address)

      setInfo({
        deposited: deposited,
        rdl: rdlBalance,
        rdx: rdxBalance,
        reward: pendingReward,
        rdlDecimals: utils.parseUnits('1', rdlDecimals),
        rdxDecimals: utils.parseUnits('1', rdxDecimals),
        address,
        needApprove: allowance.lt(rdlBalance),
      })
      // toast.success('Success to connect your wallet and get info')
    } catch {
      toast.error('Failed to connect your wallet')
    } finally {
      props.setLoading(false)
    }
  }

  const onChangeValue = (
    title: string,
    setter: React.Dispatch<React.SetStateAction<FormItem>>,
    value: number | '',
    comperator: BigNumber
  ) => {
    let valid = false
    if (value && info.address) {
      try {
        const parsedValue = info.rdlDecimals
          .div(DECIMAL_PRECISION_IN_UNIT)
          .mul(utils.parseUnits(value.toString(), DECIMAL_PRECISION))
        valid = parsedValue.gt(0) && parsedValue.lte(comperator)
      } catch (error) {
        valid = false
      }
    }
    setter({
      title: valid ? title : 'Insufficient balance',
      value: value,
      valid: valid,
    })
  }

  const withdraw = async () => {
    try {
      props.setLoading(true)
      const value = info.rdlDecimals
        .div(DECIMAL_PRECISION_IN_UNIT)
        .mul(utils.parseUnits(unStake.value, DECIMAL_PRECISION))
      const chef = await getChef()
      // withdraw
      const tx = await chef.withdraw(value.toString())
      await tx.wait()
      await loadInfo(false)
      toast.success(`Success, please check your RDL balance`)
    } catch (err) {
      toast.error('Failed, please try again later!')
    } finally {
      props.setLoading(false)
      onChangeValue('Unstake', setUnStake, '', info.deposited)
    }
  }

  const approve = async () => {
    try {
      props.setLoading(true)
      const chef = await getChef()
      const rdl = await getRDL()
      const tx = await rdl.approve(
        chef.address,
        constants.MaxUint256.toString()
      )
      await tx.wait()
      await loadInfo(false)
      toast.success(`Success, now you can staking`)
    } catch {
      toast.error('Failed, please try again later!')
    } finally {
      props.setLoading(false)
    }
  }

  const deposit = async () => {
    try {
      props.setLoading(true)
      const value = info.rdlDecimals
        .div(DECIMAL_PRECISION_IN_UNIT)
        .mul(utils.parseUnits(stake.value, DECIMAL_PRECISION))
      const chef = await getChef()
      // deposit
      const tx = await chef.deposit(value.toString())
      await tx.wait()
      await loadInfo(false)
      toast.success(`Success, please check your deposited balance`)
    } catch (err) {
      toast.error('Failed, please try again later!')
    } finally {
      props.setLoading(false)
      onChangeValue('Stake', setStake, '', info.rdl)
    }
  }

  const claim = async () => {
    try {
      props.setLoading(true)
      const chef = await getChef()
      // claim
      const pendingReward = await chef.rewardAmount()
      const tx = await chef.claim()
      await tx.wait()
      await loadInfo(false)
      toast.success(
        `Success, ${pendingReward
          .div(info.rdxDecimals)
          .toString()} RDX is transfered to your address`
      )
    } catch (err) {
      toast.error('Failed, please try again later!')
    } finally {
      props.setLoading(false)
    }
  }

  const tabs: Tab[] = [
    {
      title: 'Stake',
      child: (
        <div className='form-content-container'>
          <WalletStatus
            callback={async () => {
              loadInfo(false)
            }}
          />
          <div className='farm-amount-input'>
            <AmountInput
              balance={info.rdl}
              decimals={info.rdlDecimals}
              token={{ name: 'RDL' }}
              value={stake.value}
              placeholder='0.0'
              showBalanceInfo={info.rdlDecimals.gt(0)}
              onChange={(value) => {
                onChangeValue('Stake', setStake, value, info.rdl)
              }}
            />
          </div>
          {info.needApprove && (
            <Button type='button' value='Approve' onClick={approve} />
          )}
          <Button
            disabled={!stake.valid}
            type='button'
            value={stake.title}
            onClick={deposit}
          />
        </div>
      ),
    },
    {
      title: 'Unstake',
      child: (
        <div className='form-content-container'>
          <WalletStatus
            callback={async () => {
              loadInfo(false)
            }}
          />
          <div className='farm-amount-input'>
            <AmountInput
              balance={info.deposited}
              decimals={info.rdlDecimals}
              token={{ name: 'RDL' }}
              value={unStake.value}
              placeholder='0.0'
              showBalanceInfo={info.rdlDecimals.gt(0)}
              renderBalanceInfo={() => (
                <label className='wallet-info'>
                  Deposited:{' '}
                  <label className='number'>
                    {info.rdxDecimals.eq(0)
                      ? '0'
                      : formatCurrency(info.deposited, info.rdlDecimals)}
                  </label>{' '}
                  RDL
                </label>
              )}
              onChange={(value) =>
                onChangeValue('Unstake', setUnStake, value, info.deposited)
              }
            />
          </div>
          <Button
            disabled={!unStake.valid}
            type='button'
            value='Unstake'
            onClick={withdraw}
          />
          {info.reward.gt(0) && (
            <Button
              type='button'
              value={`Claim ${formatCurrency(
                info.reward,
                info.rdxDecimals
              )} RDX`}
              onClick={claim}
            />
          )}
        </div>
      ),
    },
  ]

  return (
    <div className='farm form-container'>
      <Tabs tabs={tabs} />
    </div>
  )
}

// <div className='wallet-info-container'>
// {info.address ? (
//   <>
//     <label className='wallet-info'>
//       Connected to: {info.address.substring(0, 30)}... <br />
//       {/* RDX Balance: {info.rdx.div(info.rdxDecimals).toString()} RDX<br /> */}
//     </label>
//     <label className='wallet-info'>
//       Pending reward:{' '}
//       <label className='number'>
//         {formatCurrency(info.reward, info.rdxDecimals)}
//       </label>{' '}
//       RDX{' '}
//       {info.reward.div(info.rdxDecimals).gt(0) && (
//         <label>
//           (
//           <a href='#' onClick={claim}>
//             Claim
//           </a>
//           )
//         </label>
//       )}
//     </label>
//   </>
// ) : (
//   <a href='#' className='wallet-info' onClick={loadInfo}>
//     Please click here to connect your wallet and continue
//   </a>
// )}
// </div>
