import React, { useEffect } from 'react'
import ethIcon from '../../img/eth.png'
import usdcIcon from '../../img/usdc.png'
import plusIcon from '../../img/plus.png'
import {
  AmountInput,
  AmountInputOnChangeProps,
  Button,
  Tab,
  Tabs,
} from '../../components'
import { constants, ethers } from 'ethers'
import './index.css'
import { WalletStatus } from '../../components/wallet-status'
import {
  decimalsCorrector,
  formatCurrency,
  getAccount,
  getPairAddress,
  getRouter,
  getTokenContract,
  requestSigner,
  switchToCorrectNetwork,
} from '../../utils/wallet'
import { ROUTERV2, ERC20_ABI, PAIR_ABI } from '../../contracts'
import { toast } from 'react-toastify'
import { Token, TokenInput, TokenSelectorState } from '../../utils/type'
import { BigNumber } from 'bignumber.js'
import { ROUNDED_NUMBER } from '../../utils/constant'

export interface PoolProps {
  setLoading: React.Dispatch<React.SetStateAction<boolean>>
  setTokenSelector: React.Dispatch<React.SetStateAction<TokenSelectorState>>
}

export interface PoolFormProps {
  tokenA: AmountInputOnChangeProps
  tokenB: AmountInputOnChangeProps
  tokenLp: AmountInputOnChangeProps
}

export const Pool = (props: PoolProps) => {
  const initialForm = {
    tokenA: {
      valid: false,
      insufficient: false,
    },
    tokenB: {
      valid: false,
      insufficient: false,
    },
    tokenLp: {
      valid: false,
      insufficient: false,
    },
  }
  const [info, setInfo] = React.useState({
    tokenA: {
      balance: new BigNumber(0),
      decimals: new BigNumber(0),
      needApprove: false,
    },
    tokenB: {
      balance: new BigNumber(0),
      decimals: new BigNumber(0),
      needApprove: false,
    },
    tokenLp: {
      balance: new BigNumber(0),
      decimals: new BigNumber(0),
      needApprove: false,
    },
  })
  const [reserves, setReserves] = React.useState({
    tokenA: new BigNumber(0),
    tokenB: new BigNumber(0),
  })
  const [poolHasDeposited, setPoolHasDeposited] = React.useState(false)
  const [form, setForm] = React.useState<PoolFormProps>({ ...initialForm })
  const [pair, setPair] = React.useState<{
    tokenA: Token
    tokenB: Token
    tokenLp: Token
  }>({
    tokenA: { name: '' },
    tokenB: { name: '' },
    tokenLp: { name: '' },
  })
  const [ratioSwitcher, setRatioSwitcher] = React.useState(true)

  useEffect(() => {
    onPairChanged()
  }, [pair.tokenA.address, pair.tokenB.address])

  const onPairChanged = async () => {
    try {
      props.setLoading(true)
      if (!pair.tokenA.address || !pair.tokenB.address) {
        return
      }
      const address = await getPairAddress(
        pair.tokenA.address,
        pair.tokenB.address
      )
      pair.tokenLp = {
        name: `${pair.tokenA.name} / ${pair.tokenB.name}`,
        address: address,
      }
      await onTokenChange('tokenLp', pair.tokenLp)
      await getPoolInfo(pair)
    } catch {
    } finally {
      props.setLoading(false)
    }
  }

  const onTokenChange = async (slot: keyof typeof pair, value: Token) => {
    try {
      props.setLoading(true)
      if (!value.address) {
        return
      }
      if (value.address === constants.AddressZero) {
        setInfo({
          ...info,
          [slot]: {
            ...info[slot],
            balance: new BigNumber(0),
            decimals: new BigNumber(0),
            needApprove: false,
          },
        })
      } else {
        const signer = await requestSigner()
        const address = await signer.getAddress()
        const contract = await getTokenContract(value.address)
        const [balance, decimals, allowance] = await Promise.all([
          contract.balanceOf(address),
          contract.decimals(),
          contract.allowance(address, ROUTERV2.address),
        ])
        setInfo({
          ...info,
          [slot]: {
            ...info[slot],
            balance: new BigNumber(balance.toString()),
            decimals: new BigNumber(decimals.toString()),
            needApprove: allowance.lt(balance),
          },
        })
      }
      setPair({
        ...pair,
        [slot]: { ...value },
      })
    } catch {
    } finally {
      props.setLoading(false)
    }
  }

  const getPoolInfo = async (newPair: typeof pair) => {
    try {
      props.setLoading(true)
      const pairAddress = newPair.tokenLp.address
      let deposited = false
      if (pairAddress && pairAddress !== constants.AddressZero) {
        const signer = await requestSigner()
        const lp = new ethers.Contract(pairAddress, PAIR_ABI, signer)
        const [totalSupply, token0, reserves] = await Promise.all([
          lp.totalSupply(),
          lp.token0(),
          lp.getReserves(),
        ])
        deposited = totalSupply.gt(0)
        const [reservesA, reservesB] =
          token0 === newPair.tokenA.address
            ? reserves
            : [reserves[1], reserves[0]]
        setReserves({
          tokenA: new BigNumber(reservesA.toString()),
          tokenB: new BigNumber(reservesB.toString()),
        })
      } else {
        setReserves({
          tokenA: new BigNumber(0),
          tokenB: new BigNumber(0),
        })
      }
      setPoolHasDeposited(deposited)
    } catch {
    } finally {
      props.setLoading(false)
    }
  }

  const onChangeAmountLP = (props: AmountInputOnChangeProps) => {
    form.tokenLp = props
    setForm({
      ...form,
    })
  }

  const onChangeAmountB = (props: AmountInputOnChangeProps) => {
    if (poolHasDeposited) {
      const { value } = props
      if (value && !reserves.tokenB.eq(0)) {
        form.tokenA.value = reserves.tokenA
          .multipliedBy(value)
          .div(reserves.tokenB)
          .toNumber()
      } else {
        form.tokenA.value = undefined
      }
    }
    form.tokenB = props
    setForm({
      ...form,
    })
  }

  const onChangeAmountA = (props: AmountInputOnChangeProps) => {
    if (true) {
      const { value } = props
      if (value && !reserves.tokenA.eq(0)) {
        form.tokenB.value = reserves.tokenB
          .multipliedBy(value)
          .div(reserves.tokenA)
          .toNumber()
      } else {
        form.tokenB.value = undefined
      }
    }
    form.tokenA = props
    setForm({
      ...form,
    })
  }

  const approve = async (slot: keyof typeof pair) => {
    try {
      props.setLoading(true)
      const token = pair[slot]
      if (!token || !token.address) {
        return
      }
      const signer = await requestSigner()
      const tokenContract = new ethers.Contract(
        token.address,
        ERC20_ABI,
        signer
      )
      const tx = await tokenContract.approve(
        ROUTERV2.address,
        constants.MaxUint256.toString()
      )
      await tx.wait()
      await onTokenChange(slot, token)
      toast.success('Success, approved')
    } catch {
      toast.error('Failed, please try again later!')
    } finally {
      props.setLoading(false)
    }
  }

  const supply = async () => {
    try {
      if (
        !form.tokenA.valid ||
        !form.tokenB.valid ||
        !form.tokenA.value ||
        !form.tokenB.value
      ) {
        return
      }
      props.setLoading(true)
      const amountA = decimalsCorrector(form.tokenA.value, info.tokenA.decimals)
      const amountB = decimalsCorrector(form.tokenB.value, info.tokenB.decimals)
      const signer = await requestSigner()
      const address = await signer.getAddress()
      const router = await getRouter()
      const tx = await router.addLiquidity(
        pair.tokenA.address,
        pair.tokenB.address,
        amountA.toString(),
        amountB.toString(),
        poolHasDeposited
          ? amountA.multipliedBy(0.95).decimalPlaces(0).toString()
          : 0,
        poolHasDeposited
          ? amountB.multipliedBy(0.95).decimalPlaces(0).toString()
          : 0,
        address,
        constants.MaxUint256
      )
      await tx.wait()
      await onTokenChange('tokenA', pair.tokenA)
      await onTokenChange('tokenB', pair.tokenB)
      toast.success(
        `Success, you supply ${form.tokenA.value} ${pair.tokenA.name}, ${form.tokenB.value} ${pair.tokenB.name} into the pool`
      )
    } catch (error) {
      toast.error('Failed, please try again later!')
    } finally {
      props.setLoading(false)
      setForm({ ...initialForm })
    }
  }

  const withdraw = async () => {
    try {
      if (!form.tokenLp.valid || !form.tokenLp.value) {
        return
      }
      props.setLoading(true)
      const amountLP = decimalsCorrector(
        form.tokenLp.value,
        info.tokenLp.decimals
      )
      const amountAmin = amountLP
        .div(info.tokenLp.balance)
        .multipliedBy(reserves.tokenA)
      const amountBmin = amountLP
        .div(info.tokenLp.balance)
        .multipliedBy(reserves.tokenB)
      const signer = await requestSigner()
      const address = await signer.getAddress()
      const router = await getRouter()
      const tx = await router.removeLiquidity(
        pair.tokenA.address,
        pair.tokenB.address,
        amountLP.toString(),
        amountAmin.multipliedBy(0.95).decimalPlaces(0).toString(),
        amountBmin.multipliedBy(0.95).decimalPlaces(0).toString(),
        address,
        constants.MaxUint256
      )
      await tx.wait()
      await onTokenChange('tokenLp', pair.tokenLp)
      toast.success(
        `Success, you withdraw ${form.tokenLp.value} ${pair.tokenLp.name} from the pool`
      )
    } catch (error) {
      console.log(error)
      toast.error('Failed, please try again later!')
    } finally {
      props.setLoading(false)
      console.log(initialForm)
      setForm({ ...initialForm })
    }
  }

  const onTokenClick = (
    exclude: string[],
    slot: Exclude<keyof typeof pair, 'tokenLp'>
  ) => {
    props.setTokenSelector({
      show: true,
      callback: async (token) => {
        props.setTokenSelector({
          show: false,
          exclude: [],
        })
        await onTokenChange(slot, token)
        setForm({ ...initialForm })
      },
      cancelCallback: () => {
        props.setTokenSelector({
          show: false,
          exclude: [],
        })
      },
      exclude: exclude,
    })
  }

  const calculateReceivedAmount = (
    input: number,
    decimals: BigNumber,
    totalTokenAmount: BigNumber
  ) => {
    const value = decimalsCorrector(input, info.tokenLp.decimals)
    return formatCurrency(
      value.div(info.tokenLp.balance).multipliedBy(totalTokenAmount),
      decimals
    )
  }

  const renderRatio = () => {
    if (!pair.tokenA || !pair.tokenB) {
      return
    }
    const tokenA = ratioSwitcher ? reserves.tokenA : reserves.tokenB
    const tokenALabel = ratioSwitcher ? pair.tokenA.name : pair.tokenB.name
    const tokenB = ratioSwitcher ? reserves.tokenB : reserves.tokenA
    const tokenBLabel = ratioSwitcher ? pair.tokenB.name : pair.tokenA.name
    return (
      <label
        className='rate-info'
        onClick={() => {
          setRatioSwitcher(!ratioSwitcher)
        }}
      >
        <label className='number'>
          {!tokenA || new BigNumber(tokenA).eq(0) ? '-' : '1'}
        </label>{' '}
        {tokenALabel} ={' '}
        <label className='number'>
          {!tokenA || new BigNumber(tokenA).eq(0)
            ? '-'
            : tokenB.div(tokenA).decimalPlaces(ROUNDED_NUMBER).toString()}
        </label>{' '}
        {tokenBLabel}
      </label>
    )
  }

  const renderEstimate = () => {
    if (!form.tokenLp.value) {
      return
    }
    return (
      <div className='rate-info' style={{ textAlign: 'right' }}>
        <p>
          <label className='number'>
            {calculateReceivedAmount(
              form.tokenLp.value,
              info.tokenA.decimals,
              reserves.tokenA
            )}
          </label>{' '}
          {pair.tokenA.name}
        </p>
        <p>
          <label className='number'>
            {calculateReceivedAmount(
              form.tokenLp.value,
              info.tokenB.decimals,
              reserves.tokenB
            )}
          </label>{' '}
          {pair.tokenB.name}
        </p>
      </div>
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
              onTokenClick={(token) => {
                onTokenClick(pair.tokenB ? [pair.tokenB.name] : [], 'tokenA')
              }}
              balance={info.tokenA.balance}
              decimals={info.tokenA.decimals}
              token={pair.tokenA}
              value={form.tokenA.value}
              placeholder='0.0'
              onChange={onChangeAmountA}
              style={{ marginBottom: 0 }}
              showBalanceInfo
            />
            <img className='plus-icon' src={plusIcon} />
          </div>
          <AmountInput
            onTokenClick={(token) => {
              onTokenClick(pair.tokenA ? [pair.tokenA.name] : [], 'tokenB')
            }}
            balance={info.tokenB.balance}
            decimals={info.tokenB.decimals}
            token={pair.tokenB}
            value={form.tokenB.value}
            placeholder='0.0'
            onChange={onChangeAmountB}
            showBalanceInfo
          />
          {poolHasDeposited && reserves.tokenA && reserves.tokenB && (
            <div className='rate-container'>
              <label className='rate-info'>Rate</label>
              {renderRatio()}
            </div>
          )}
          {info.tokenA.needApprove && pair.tokenA.name && (
            <Button
              type='button'
              value={`Approve ${pair.tokenA.name}`}
              onClick={async () => {
                approve('tokenA')
              }}
            />
          )}
          {info.tokenB.needApprove && pair.tokenB.name && (
            <Button
              type='button'
              value={`Approve ${pair.tokenB.name}`}
              onClick={async () => {
                approve('tokenB')
              }}
            />
          )}
          <Button
            type='button'
            value={
              form.tokenA.insufficient
                ? `Insufficient ${pair.tokenA.name} balance`
                : form.tokenB.insufficient
                ? `Insufficient ${pair.tokenB.name} balance`
                : 'Supply'
            }
            onClick={supply}
            disabled={!form.tokenA.valid || !form.tokenB.valid}
          />
        </div>
      ),
    },
    {
      title: 'Remove',
      child: (
        <div className='form-content-container'>
          <WalletStatus callback={async () => {}} />
          <AmountInput
            onTokenClick={(token) => {
              onTokenClick(
                pair.tokenA.name === token?.name
                  ? [pair.tokenB.name]
                  : [pair.tokenA.name],
                pair.tokenA.name === token?.name ? 'tokenA' : 'tokenB'
              )
            }}
            balance={info.tokenLp.balance}
            decimals={info.tokenLp.decimals}
            pair={[pair.tokenA, pair.tokenB]}
            value={form.tokenLp.value}
            placeholder='0.0'
            onChange={onChangeAmountLP}
            style={{ marginBottom: 0 }}
            showBalanceInfo
          />
          {info.tokenLp.balance.gt(0) && form.tokenLp.value && (
            <div className='rate-container'>
              <label className='rate-info'>Estimate receive amount</label>
              {renderEstimate()}
            </div>
          )}
          {info.tokenLp.needApprove && (
            <Button
              type='button'
              value={`Approve ${pair.tokenLp.name}`}
              onClick={async () => {
                approve('tokenLp')
              }}
            />
          )}
          <Button
            type='button'
            value={
              form.tokenLp.insufficient
                ? `Insufficient ${pair.tokenLp.name} balance`
                : 'Withdraw'
            }
            onClick={withdraw}
            disabled={!form.tokenLp.valid}
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
