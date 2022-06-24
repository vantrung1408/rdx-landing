import React from 'react'
import './App.css'
import { ethers, BigNumber, Signer, utils, constants } from 'ethers'
import { Input } from './components'
import { Button } from './components/button/button'
import { RDL, RDX, CHEF } from './contracts'
import loading from './img/loading.gif'

function App() {
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
    deposit: 0,
    withdraw: 0,
  })
  const [depositing, setDepositing] = React.useState(true)
  const [withdrawing, setWithdrawing] = React.useState(true)

  React.useEffect(() => {
    loadInfo()
  }, [])

  const requestSigner = async (): Promise<Signer> => {
    const provider = new ethers.providers.Web3Provider(window.ethereum, 'any')
    await provider.send('eth_requestAccounts', [])
    const signer = provider.getSigner()
    return signer
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

  const loadInfo = async () => {
    setDepositing(true)
    setWithdrawing(true)

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
    const deposited = await chef.depositedBalance(address)
    const pendingReward = await chef.rewardAmount(address)
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
    setDepositing(false)
    setWithdrawing(false)
  }

  const withdraw = async () => {
    try {
      setWithdrawing(true)
      const signer = await requestSigner()
      const address = await signer.getAddress()
      const value = form.withdraw
    } catch (err) {
      console.log(err)
    } finally {
      setWithdrawing(false)
    }
  }

  const deposit = async () => {
    // const chef = await getChef()
    try {
      setDepositing(true)
      const signer = await requestSigner()
      const address = await signer.getAddress()
      const value = info.rdlDecimals.mul(form.deposit)

      // validate
      if (value.gt(info.rdl)) {
        return
      }

      const chef = await getChef()
      const rdl = await getRDL()
      // approve
      const allowance: BigNumber = await rdl.allowance(address, chef.address)
      if (allowance.lt(value)) {
        await rdl.approve(chef.address, constants.MaxUint256.toString())
      }
      // deposit
      const tx = await chef.deposit(info.address, value.toString())
      await tx.wait()
      setForm({
        ...form,
        deposit: 0,
      })
      await loadInfo()
    } catch (err) {
      console.log(err)
    } finally {
      setDepositing(false)
    }
  }

  return (
    <div className='form-container'>
      <div>
        <div className='wallet-info-container'>
          {info.address ? (
            <label className='wallet-info'>
              Connected to: {info.address.substring(0, 30)}... <br />
              RDL Balance: {info.rdl.div(info.rdlDecimals).toString()} RDL{' '}
              <br />
              RDX Balance: {info.rdx.div(info.rdxDecimals).toString()} RDX
            </label>
          ) : (
            <a>Connect wallet</a>
          )}
        </div>
        <div className='form-wrapper'>
          <div className='form-content-container'>
            <label className='amount'>
              Deposited:{' '}
              <label className='amount-number'>
                {info.rdlDecimals.eq(0)
                  ? '0'
                  : info.deposited.div(info.rdlDecimals).toString()}
              </label>{' '}
              RDL
            </label>
            <Input
              value={form.deposit}
              className='amount-input'
              placeholder='0.0'
              onChange={(event: any) =>
                setForm({
                  deposit: event.target.value,
                  withdraw: form.withdraw,
                })
              }
            />
            <Button type='button' value='Deposit' onClick={deposit} />
            {depositing && (
              <div className='loading-container'>
                <img className='loading' src={loading} />
                <label className='notify'>just a second...</label>
              </div>
            )}
          </div>
          <div className='form-content-container'>
            <label className='amount'>
              Pending reward:{' '}
              <label className='amount-number'>
                {info.rdxDecimals.eq(0)
                  ? '0'
                  : info.reward.div(info.rdxDecimals).toString()}
              </label>{' '}
              RDX
            </label>
            <Input
              value={form.withdraw}
              className='amount-input'
              placeholder='0.0'
              onChange={(event: any) =>
                setForm({
                  withdraw: event.target.value,
                  deposit: form.withdraw,
                })
              }
            />
            <div className='withdraw-container'>
              <Button type='button' value='Claim' id='claim-btn' />
              <Button type='button' value='Withdraw' onClick={withdraw} />
            </div>
            {withdrawing && (
              <div className='loading-container'>
                <img className='loading' src={loading} />
                <label className='notify'>just a second...</label>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
