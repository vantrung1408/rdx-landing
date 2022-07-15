import React from 'react'
import './index.css'
import { ethers, constants } from 'ethers'
import { AmountInput, Button, Tab, Tabs } from '../../components'
import { ROUTERV2, ERC20_ABI, CHEF } from '../../contracts'
import { toast } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import {
  decimalsCorrector,
  formatCurrency,
  getAccount,
  requestSigner,
  switchToCorrectNetwork,
} from '../../utils/wallet'
import { FormItem, TokenSelectorState } from '../../utils/type'
import { WalletStatus } from '../../components/wallet-status'
import { BigNumber } from 'bignumber.js'

export interface FarmProps {
  setLoading: React.Dispatch<React.SetStateAction<boolean>>
  setTokenSelector: React.Dispatch<React.SetStateAction<TokenSelectorState>>
}

export const Farm = (props: FarmProps) => {
  const [info, setInfo] = React.useState({
    rdl: new BigNumber(0),
    rdx: new BigNumber(0),
    deposited: new BigNumber(0),
    reward: new BigNumber(0),
    rdlDecimals: new BigNumber(0),
    rdxDecimals: new BigNumber(0),
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
    const handler = () => {
      loadInfo(false)
    }
    window.ethereum.removeListener('accountsChanged', handler)
    window.ethereum.removeListener('chainChanged', handler)
    window.ethereum.on('accountsChanged', handler)
    window.ethereum.on('chainChanged', handler)
  }

  const getChef = async () => {
    const signer = await requestSigner()
    const chef = new ethers.Contract(CHEF.address, CHEF.abi, signer)
    return chef
  }

  const getLP = async () => {
    const signer = await requestSigner()
    const lp = new ethers.Contract(ROUTERV2.address, ROUTERV2.abi, signer)
    return lp
  }

  const getRDX = async () => {
    const signer = await requestSigner()
    const rdx = new ethers.Contract('', ERC20_ABI, signer)
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
      const [rdl, rdx, chef] = await Promise.all([getLP(), getRDX(), getChef()])
      const [
        rdlDecimals,
        rdlBalance,
        rdxDecimals,
        rdxBalance,
        pendingReward,
        allowance,
      ] = await Promise.all([
        rdl.decimals(),
        rdl.balanceOf(address),
        rdl.decimals(),
        rdx.balanceOf(address),
        chef.rewardAmount(),
        rdl.allowance(address, chef.address),
      ])
      //
      const deposited = (await chef.users(address)).balance
      // const pendingReward = BigNumber.from(0)

      setInfo({
        deposited: new BigNumber(deposited.toString()),
        rdl: new BigNumber(rdlBalance.toString()),
        rdx: new BigNumber(rdxBalance.toString()),
        reward: new BigNumber(pendingReward.toString()),
        rdlDecimals: new BigNumber(rdlDecimals.toString()),
        rdxDecimals: new BigNumber(rdxDecimals.toString()),
        needApprove: allowance.lt(rdlBalance),
      })
      // toast.success('Success to connect your wallet and get info')
    } catch {
      // toast.error('Failed to connect your wallet')
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
    if (value && info.rdlDecimals.gt(0)) {
      try {
        const parsedValue = decimalsCorrector(value, info.rdlDecimals)
        valid = parsedValue.gt(0) && parsedValue.lte(comperator)
        if (parsedValue.gt(comperator)) {
          title = 'Insufficient balance'
        }
      } catch (error) {
        valid = false
      }
    }
    setter({
      title: title,
      value: value,
      valid: valid,
    })
  }

  const withdraw = async () => {
    try {
      if (!unStake.valid) {
        return
      }
      props.setLoading(true)
      const value = decimalsCorrector(unStake.value, info.rdlDecimals)
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
      const rdl = await getLP()
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
      if (!stake.valid) {
        return
      }
      props.setLoading(true)
      const value = decimalsCorrector(stake.value, info.rdlDecimals)
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
            disabled={!stake.valid && !info.needApprove}
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
              balanceInfoTitle='Deposited'
              onChange={(value) =>
                onChangeValue('Unstake', setUnStake, value, info.deposited)
              }
            />
          </div>
          <Button
            disabled={!unStake.valid}
            type='button'
            value={unStake.title}
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
