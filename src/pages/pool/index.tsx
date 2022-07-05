import React from 'react'
import ethIcon from '../../img/eth.png'
import usdcIcon from '../../img/usdc.png'
import plusIcon from '../../img/plus.png'
import { AmountInput, Button, Tab, Tabs } from '../../components'
import { BigNumber, constants, ethers, utils } from 'ethers'
import './index.css'
import { WalletStatus } from '../../components/wallet-status'
import {
  getAccount,
  requestSigner,
  switchToCorrectNetwork,
} from '../../utils/wallet'
import { LP, WETH, USDC } from '../../contracts'
import { toast } from 'react-toastify'
import {
  DECIMAL_PRECISION,
  DECIMAL_PRECISION_IN_UNIT,
} from '../../utils/constant'

export interface PoolProps {
  setLoading: React.Dispatch<React.SetStateAction<boolean>>
}

export const Pool = (props: PoolProps) => {
  const [info, setInfo] = React.useState({
    tokenA: BigNumber.from(0),
    tokenB: BigNumber.from(0),
    tokenADecimals: BigNumber.from(0),
    tokenBDecimals: BigNumber.from(0),
    needApproveTokenA: false,
    needApproveTokenB: false,
    ratio: {
      tokenA: 1,
      tokenB: 1,
    },
  })
  const [form, setForm] = React.useState({
    add: {
      tokenA: {
        value: '',
        valid: false,
      },
      tokenB: {
        value: '',
        valid: false,
      },
      title: '',
    },
  })
  const pairs = [
    {
      tokenA: {
        name: 'WETH',
        logo: ethIcon,
        contract: async () => {
          const signer = await requestSigner()
          const tokenA = new ethers.Contract(WETH.address, WETH.abi, signer)
          return tokenA
        },
      },
      tokenB: {
        name: 'USDC',
        logo: usdcIcon,
        contract: async () => {
          const signer = await requestSigner()
          const tokenB = new ethers.Contract(USDC.address, USDC.abi, signer)
          return tokenB
        },
      },
    },
  ]
  const [selected, setSelected] = React.useState(0)
  const [pair, setPair] = React.useState(pairs[selected])
  const [ratioSwitcher, setRatioSwitcher] = React.useState(true)

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

  const getLP = async () => {
    const signer = await requestSigner()
    const lp = new ethers.Contract(LP.address, LP.abi, signer)
    return lp
  }

  const loadInfo = async (forceSwitchNetwork: boolean = false) => {
    try {
      props.setLoading(true)
      if (forceSwitchNetwork) {
        await switchToCorrectNetwork()
      }

      const signer = await requestSigner()
      const address = await signer.getAddress()
      const [lp, tokenA, tokenB] = await Promise.all([
        getLP(),
        pair.tokenA.contract(),
        pair.tokenB.contract(),
      ])
      // get tokenA balance
      const [
        tokenADecimals,
        tokenABalance,
        tokenAAllowance,
        tokenBDecimals,
        tokenBBalance,
        tokenBAllowance,
      ] = await Promise.all([
        tokenA.decimals(),
        tokenA.balanceOf(address),
        tokenA.allowance(address, lp.address),
        tokenB.decimals(),
        tokenB.balanceOf(address),
        tokenB.allowance(address, lp.address),
      ])
      const ratio: BigNumber[] = await lp.prepareAmount(1, await lp.amountB())

      setInfo({
        tokenA: tokenABalance,
        tokenB: tokenBBalance,
        tokenADecimals: utils.parseUnits('1', tokenADecimals),
        tokenBDecimals: utils.parseUnits('1', tokenBDecimals),
        needApproveTokenA: tokenAAllowance.lt(tokenABalance),
        needApproveTokenB: tokenBAllowance.lt(tokenBBalance),
        ratio: {
          tokenA: ratio[0].toNumber(),
          tokenB: ratio[1].toNumber(),
        },
      })
    } catch {
      toast.error('Failed to connect your wallet')
    } finally {
      props.setLoading(false)
    }
  }

  // const onChangeValue = async (
  //   title: string,
  //   value: number | '',
  //   comperator: BigNumber
  // ) => {
  //   let valueA = '',
  //     valueB = ''
  //   if (value) {
  //     const isUpdateA = comperator.eq(info.tokenA)
  //     const lp = await getLP()
  //     const values: BigNumber[] = await lp.prepareAmount(
  //       isUpdateA ? value : await lp.amountA(),
  //       isUpdateA ? await lp.amountB() : value
  //     )
  //     console.log(values.map(c => c.toString()))
  //   }
  //   form.add.tokenA.value = valueA
  //   form.add.tokenB.value = valueB
  //   setForm(form)
  // }

  const onChangeAmountB = (value: number | '') => {
    if (value && info.ratio.tokenB) {
      form.add.tokenA.value = (
        (value * info.ratio.tokenA) /
        info.ratio.tokenB
      ).toString()
    } else {
      form.add.tokenA.value = ''
    }
    form.add.tokenB.value = value.toString()
    setForm({
      ...form,
    })
  }

  const onChangeAmountA = (value: number | '') => {
    if (value && info.ratio.tokenA) {
      form.add.tokenB.value = (
        (value * info.ratio.tokenB) /
        info.ratio.tokenA
      ).toString()
    } else {
      form.add.tokenB.value = ''
    }
    form.add.tokenA.value = value.toString()
    setForm({
      ...form,
    })
  }

  const approve = async (contract: ethers.Contract) => {
    try {
      props.setLoading(true)
      const lp = await getLP()
      const tx = await contract.approve(
        lp.address,
        constants.MaxUint256.toString()
      )
      await tx.wait()
      await loadInfo(false)
      toast.success('Success, approved')
    } catch {
      toast.error('Failed, please try again later!')
    } finally {
      props.setLoading(false)
    }
  }

  const supply = async () => {
    try {
      props.setLoading(true)
      const amountA = info.tokenADecimals
        .div(DECIMAL_PRECISION_IN_UNIT)
        .mul(utils.parseUnits(form.add.tokenA.value, DECIMAL_PRECISION))
      const amountB = info.tokenBDecimals
        .div(DECIMAL_PRECISION_IN_UNIT)
        .mul(utils.parseUnits(form.add.tokenB.value, DECIMAL_PRECISION))
      const lp = await getLP()
      const tx = await lp.add(amountA, amountB)
      await tx.wait()
      await loadInfo()
      toast.success(
        `Success, you supply ${form.add.tokenA.value} ${pair.tokenA.name}, ${form.add.tokenB.value} ${pair.tokenB.name} into the pool`
      )
    } catch {
      toast.error('Failed, please try again later!')
    } finally {
      props.setLoading(false)
      onChangeAmountA('')
    }
  }

  const renderRatio = () => {
    const tokenA = ratioSwitcher ? info.ratio.tokenA : info.ratio.tokenB
    const tokenALabel = ratioSwitcher ? pair.tokenA.name : pair.tokenB.name
    const tokenB = ratioSwitcher ? info.ratio.tokenB : info.ratio.tokenA
    const tokenBLabel = ratioSwitcher ? pair.tokenB.name : pair.tokenA.name
    return (
      <label
        className='rate-info'
        onClick={() => {
          setRatioSwitcher(!ratioSwitcher)
        }}
      >
        <label className='number'>{tokenA / tokenA}</label> {tokenALabel} ={' '}
        <label className='number'>{tokenB / tokenA}</label> {tokenBLabel}
      </label>
    )
  }

  const tabs: Tab[] = [
    {
      title: 'Add',
      child: (
        <div className='form-content-container'>
          <WalletStatus callback={async () => {}} />
          <div className='pool-amount-input'>
            <AmountInput
              balance={info.tokenA}
              decimals={info.tokenADecimals}
              token={{
                name: pair.tokenA.name,
                logo: pair.tokenA.logo,
              }}
              value={form.add.tokenA.value}
              placeholder='0.0'
              onChange={(value) => {
                onChangeAmountA(value)
              }}
              style={{ marginBottom: 0 }}
              showBalanceInfo
            />
            <img className='plus-icon' src={plusIcon} />
          </div>
          <AmountInput
            balance={info.tokenB}
            decimals={info.tokenBDecimals}
            token={{
              name: pair.tokenB.name,
              logo: pair.tokenB.logo,
            }}
            value={form.add.tokenB.value}
            placeholder='0.0'
            onChange={(value) => {
              onChangeAmountB(value)
            }}
            showBalanceInfo
          />
          {info.ratio.tokenA && info.ratio.tokenB && (
            <div className='rate-container'>
              <label className='rate-info'>Rate</label>
              {renderRatio()}
            </div>
          )}
          {info.needApproveTokenA && (
            <Button
              type='button'
              value={`Approve ${pair.tokenA.name}`}
              onClick={async () => {
                approve(await pair.tokenA.contract())
              }}
            />
          )}
          {info.needApproveTokenB && (
            <Button
              type='button'
              value={`Approve ${pair.tokenB.name}`}
              onClick={async () => {
                approve(await pair.tokenB.contract())
              }}
            />
          )}
          <Button
            type='button'
            value='Supply'
            onClick={supply}
            disabled={false}
          />
        </div>
      ),
    },
    {
      title: 'Remove',
      child: (
        <div className='form-content-container'>
          <WalletStatus callback={async () => {}} />
          <div className='pool-amount-input'>
            <AmountInput
              balance={BigNumber.from(100000)}
              decimals={BigNumber.from(100000)}
              token={{
                name: pair.tokenA.name,
                logo: pair.tokenA.logo,
              }}
              value={form.add.tokenA.value}
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
            token={{
              name: pair.tokenB.name,
              logo: pair.tokenB.logo,
            }}
            value={form.add.tokenB.value}
            placeholder='0.0'
            onChange={(value) => {}}
            showBalanceInfo
          />
          <div className='rate-container'>
            <label className='rate-info'>Rate</label>
            <label className='rate-info'>
              <label className='number'>1</label> TOKENA ={' '}
              <label className='number'>1000</label> TOKENB
            </label>
          </div>
          <Button
            type='button'
            value='Withdraw'
            onClick={supply}
            disabled={true}
          />
        </div>
      ),
    },
  ]

  return (
    <div className='pool form-container'>
      <Tabs tabs={tabs} />
    </div>
  )
}
