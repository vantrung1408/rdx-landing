import React from 'react'
import './index.css'
import { ethers, BigNumber, Signer, utils, constants } from 'ethers'
import { AmountInput, Button } from '../../components'
import { RDL, RDX, CHEF } from '../../contracts'
import { toast } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import { formatCurrency, requestSigner } from '../../utils/wallet'

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
  })
  const [form, setForm] = React.useState({
    deposit: '',
    withdraw: '',
  })
  const [isValid, setIsValid] = React.useState({
    deposit: false,
    withdraw: false,
  })

  React.useEffect(() => {
    loadInfo()
  }, [])

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

  const loadInfo = async () => {
    try {
      props.setLoading(true)

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

      setInfo({
        deposited: deposited,
        rdl: rdlBalance,
        rdx: rdxBalance,
        reward: pendingReward,
        rdlDecimals: utils.parseUnits('1', rdlDecimals),
        rdxDecimals: utils.parseUnits('1', rdxDecimals),
        address,
      })
      // toast.success('Success to connect your wallet and get info')
    } catch {
      toast.error('Failed to connect your wallet')
    } finally {
      props.setLoading(false)
    }
  }

  const onChangeValue = (
    key: keyof typeof form,
    value: number | '',
    comperator: BigNumber
  ) => {
    setForm({
      ...form,
      [key]: value,
    })
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
    setIsValid({
      ...isValid,
      [key]: valid,
    })
  }

  const withdraw = async () => {
    try {
      props.setLoading(true)
      const value = info.rdlDecimals
        .div(DECIMAL_PRECISION_IN_UNIT)
        .mul(utils.parseUnits(form.withdraw, DECIMAL_PRECISION))
      const chef = await getChef()
      // withdraw
      const tx = await chef.withdraw(value.toString())
      await tx.wait()
      await loadInfo()
      toast.success(`Success, please check your RDL balance`)
    } catch (err) {
      toast.error('Failed, please try again later!')
    } finally {
      props.setLoading(false)
      onChangeValue('withdraw', '', info.deposited)
    }
  }

  const deposit = async () => {
    try {
      props.setLoading(true)
      const signer = await requestSigner()
      const address = await signer.getAddress()
      const value = info.rdlDecimals
        .div(DECIMAL_PRECISION_IN_UNIT)
        .mul(utils.parseUnits(form.deposit, DECIMAL_PRECISION))
      const chef = await getChef()
      const rdl = await getRDL()
      // approve
      const allowance: BigNumber = await rdl.allowance(address, chef.address)
      if (allowance.lt(value)) {
        const tx = await rdl.approve(
          chef.address,
          constants.MaxUint256.toString()
        )
        await tx.wait()
      }
      // deposit
      const tx = await chef.deposit(value.toString())
      await tx.wait()
      await loadInfo()
      toast.success(`Success, please check your deposited balance`)
    } catch (err) {
      toast.error('Failed, please try again later!')
    } finally {
      props.setLoading(false)
      onChangeValue('deposit', '', info.rdl)
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
      await loadInfo()
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

  return (
    <div className='farm form-container'>
      <div>
        <div className='wallet-info-container'>
          {info.address ? (
            <>
              <label className='wallet-info'>
                Connected to: {info.address.substring(0, 30)}... <br />
                {/* RDX Balance: {info.rdx.div(info.rdxDecimals).toString()} RDX<br /> */}
              </label>
              <label className='wallet-info'>
                Pending reward:{' '}
                <label className='number'>
                  {formatCurrency(info.reward, info.rdxDecimals)}
                </label>{' '}
                RDX{' '}
                {info.reward.div(info.rdxDecimals).gt(0) && (
                  <label>
                    (
                    <a href='#' onClick={claim}>
                      Claim
                    </a>
                    )
                  </label>
                )}
              </label>
            </>
          ) : (
            <a href='#' className='wallet-info' onClick={loadInfo}>
              Please click here to connect your wallet and continue
            </a>
          )}
        </div>
        <div className='form-wrapper'>
          <div className='form-content-container'>
            <label className='amount'>
              Balance:{' '}
              <label className='amount-number number'>
                {info.rdlDecimals.eq(0)
                  ? '0'
                  : formatCurrency(info.rdl, info.rdlDecimals)}
              </label>{' '}
              RDL
            </label>
            <div className='farm-amount-input'>
              <AmountInput
                balance={info.rdl}
                decimals={info.rdlDecimals}
                token={{ name: 'RDL' }}
                value={form.deposit}
                placeholder='0.0'
                onChange={(value) => {
                  onChangeValue('deposit', value, info.rdl)
                }}
              />
            </div>
            <Button
              disabled={!isValid.deposit}
              type='button'
              value='Deposit'
              onClick={deposit}
            />
          </div>
          <div className='form-content-container'>
            <label className='amount'>
              Deposited:{' '}
              <label className='amount-number number'>
                {info.rdxDecimals.eq(0)
                  ? '0'
                  : formatCurrency(info.deposited, info.rdxDecimals)}
              </label>{' '}
              RDL
            </label>
            <div className='farm-amount-input'>
              <AmountInput
                balance={info.deposited}
                decimals={info.rdlDecimals}
                token={{ name: 'RDL' }}
                value={form.withdraw}
                placeholder='0.0'
                onChange={(value) =>
                  onChangeValue('withdraw', value, info.deposited)
                }
              />
            </div>
            <Button
              disabled={!isValid.withdraw}
              type='button'
              value='Withdraw'
              onClick={withdraw}
            />
          </div>
        </div>
      </div>
    </div>
  )
}