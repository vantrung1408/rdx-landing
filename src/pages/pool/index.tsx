import React from 'react'
import ethIcon from '../../img/eth.png'
import usdcIcon from '../../img/usdc.png'
import plusIcon from '../../img/plus.png'
import { AmountInput, Button, Tab, Tabs } from '../../components'
import { constants, ethers } from 'ethers'
import './index.css'
import { WalletStatus } from '../../components/wallet-status'
import {
  decimalsCorrector,
  getAccount,
  getPairAddress,
  getRouter,
  getTokenContract,
  requestSigner,
  switchToCorrectNetwork,
} from '../../utils/wallet'
import { ROUTERV2, ERC20_ABI, PAIR_ABI } from '../../contracts'
import { toast } from 'react-toastify'
import { FormProps, Token, TokenSelectorState } from '../../utils/type'
import { BigNumber } from 'bignumber.js'
import { ROUNDED_NUMBER } from '../../utils/constant'

export interface PoolProps {
  setLoading: React.Dispatch<React.SetStateAction<boolean>>
  setTokenSelector: React.Dispatch<React.SetStateAction<TokenSelectorState>>
}

export const Pool = (props: PoolProps) => {
  const [info, setInfo] = React.useState({
    tokenA: {
      balance: new BigNumber(0),
      decimals: new BigNumber(0),
      needApprove: new BigNumber(0),
    },
    tokenB: {
      balance: new BigNumber(0),
      decimals: new BigNumber(0),
      needApprove: new BigNumber(0),
    },
  })
  const [pooled, setPooled] = React.useState({
    lp: new BigNumber(0),
    tokenA: new BigNumber(0),
    tokenB: new BigNumber(0),
  })
  const [ratio, setRatio] = React.useState({
    tokenA: 1,
    tokenB: 1,
  })
  const [poolHasDeposited, setPoolHasDeposited] = React.useState(false)
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
      title: 'Supply',
    } as FormProps,
    remove: {
      tokenA: {
        value: '',
        valid: false,
      },
      title: 'Withdraw',
    } as FormProps,
  })
  const [pair, setPair] = React.useState<{ tokenA?: Token; tokenB?: Token }>({
    tokenA: undefined,
    tokenB: undefined,
  })
  const [ratioSwitcher, setRatioSwitcher] = React.useState(true)

  const onTokenChange = async (slot: keyof typeof pair, value: Token) => {
    try {
      props.setLoading(true)
      if (!value.address) {
        return
      }
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
      const newPair = {
        ...pair,
        [slot]: { ...value },
      }
      setPair(newPair)
      await getPoolInfo(newPair)
    } catch {
    } finally {
      props.setLoading(false)
    }
  }

  const getPoolInfo = async (newPair: typeof pair) => {
    try {
      props.setLoading(true)
      if (!newPair.tokenA?.address || !newPair.tokenB?.address) {
        return
      }
      const pairAddress = await getPairAddress(
        newPair.tokenA.address,
        newPair.tokenB.address
      )
      let deposited = false
      if (pairAddress !== constants.AddressZero) {
        const signer = await requestSigner()
        const address = await signer.getAddress()
        const lp = new ethers.Contract(pairAddress, PAIR_ABI, signer)
        const totalSupply = await lp.totalSupply()
        deposited = totalSupply.gt(0)

        const token0 = await lp.token0()
        const reserves = await lp.getReserves()
        const [reservesA, reservesB] =
          token0 === newPair.tokenA.address
            ? reserves
            : [reserves[1], reserves[0]]
        setRatio({
          tokenA: 1,
          tokenB: reservesB.div(reservesA).toNumber(),
        })

        const currentLP = new BigNumber(
          (await lp.balanceOf(address)).toString()
        )
        const pooledRatio = currentLP.dividedBy(totalSupply.toString())
        setPooled({
          lp: currentLP,
          tokenA: pooledRatio.multipliedBy(reservesA.toString()),
          tokenB: pooledRatio.multipliedBy(reservesB.toString()),
        })
      }
      setPoolHasDeposited(deposited)
    } catch {
    } finally {
      props.setLoading(false)
    }
  }

  const onChangeAmountB = (
    title: string,
    formProps: FormProps,
    value: number | '',
    balanceA: BigNumber,
    balanceB: BigNumber
  ) => {
    const { tokenA, tokenB } = formProps
    if (poolHasDeposited) {
      if (value && ratio.tokenB) {
        tokenA.value = ((value * ratio.tokenA) / ratio.tokenB).toString()
      } else {
        tokenA.value = ''
      }
    }
    tokenB.value = value.toString()
    checkFormValidAndGenTitle(title, formProps, balanceA, balanceB)
    setForm({
      ...form,
    })
  }

  const onChangeAmountA = (
    title: string,
    formProps: FormProps,
    value: number | '',
    balanceA: BigNumber,
    balanceB: BigNumber
  ) => {
    const { tokenA, tokenB } = formProps
    if (poolHasDeposited) {
      if (value && ratio.tokenA) {
        tokenB.value = ((value * ratio.tokenB) / ratio.tokenA).toString()
      } else {
        tokenB.value = ''
      }
    }
    tokenA.value = value.toString()
    checkFormValidAndGenTitle(title, formProps, balanceA, balanceB)
    setForm({
      ...form,
    })
  }

  const checkFormValidAndGenTitle = (
    title: string,
    formProps: FormProps,
    balanceA: BigNumber,
    balanceB: BigNumber
  ) => {
    if (!pair.tokenA || !pair.tokenB) {
      return
    }
    const { tokenA, tokenB } = formProps
    const data = [
      {
        ref: tokenA,
        value: tokenA.value,
        decimals: info.tokenA.decimals,
        balance: balanceA,
        name: pair.tokenA.name,
      },
      {
        ref: tokenB,
        value: tokenB.value,
        decimals: info.tokenB.decimals,
        balance: balanceB,
        name: pair.tokenB.name,
      },
    ]
    try {
      for (let { ref, value, decimals, balance, name } of data) {
        const parsedValue = decimalsCorrector(value, decimals)
        ref.valid = !!value && balance.gte(parsedValue)
        formProps.title = balance.lt(parsedValue)
          ? `Insufficient ${name} balance`
          : title
        if (!ref.valid) {
          break
        }
      }
    } catch {
      tokenA.valid = false
      tokenB.valid = false
      formProps.title = title
    }
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

  const resetForm = (title: string) => {
    setForm({
      ...form,
      add: {
        title: title,
        tokenA: {
          valid: false,
          value: '',
        },
        tokenB: {
          valid: false,
          value: '',
        },
      },
    })
  }

  const supply = async () => {
    try {
      if (
        !pair.tokenA?.name ||
        !pair.tokenB?.name ||
        !form.add.tokenA.valid ||
        !form.add.tokenB.valid
      ) {
        return
      }
      props.setLoading(true)
      const amountA = decimalsCorrector(
        form.add.tokenA.value,
        info.tokenA.decimals
      )
      const amountB = decimalsCorrector(
        form.add.tokenB.value,
        info.tokenB.decimals
      )
      const signer = await requestSigner()
      const address = await signer.getAddress()
      const router = await getRouter()
      const tx = await router.addLiquidity(
        pair.tokenA.address,
        pair.tokenB.address,
        amountA.toString(),
        amountB.toString(),
        poolHasDeposited ? amountA.multipliedBy(0.95).toString() : 0,
        poolHasDeposited ? amountB.multipliedBy(0.95).toString() : 0,
        address,
        constants.MaxUint256
      )
      await tx.wait()
      await onTokenChange('tokenA', pair.tokenA)
      await onTokenChange('tokenB', pair.tokenB)
      toast.success(
        `Success, you supply ${form.add.tokenA.value} ${pair.tokenA.name}, ${form.add.tokenB.value} ${pair.tokenB.name} into the pool`
      )
    } catch (error) {
      toast.error('Failed, please try again later!')
    } finally {
      props.setLoading(false)
      resetForm('Supply')
    }
  }

  const withdraw = async () => {
    try {
      if (
        !pair.tokenA?.name ||
        !pair.tokenB?.name ||
        !form.remove.tokenA.valid ||
        !form.remove.tokenB.valid
      ) {
        return
      }
      props.setLoading(true)
      const amountA = decimalsCorrector(
        form.remove.tokenA.value,
        info.tokenA.decimals
      )
      const amountB = decimalsCorrector(
        form.remove.tokenB.value,
        info.tokenB.decimals
      )
      //
      toast.success(
        `Success, you withdraw ${form.remove.tokenA.value} ${pair.tokenA.name}, ${form.remove.tokenB.value} ${pair.tokenB.name} from the pool`
      )
    } catch {
      toast.error('Failed, please try again later!')
    } finally {
      props.setLoading(false)
      resetForm('Withdraw')
    }
  }

  const renderRatio = () => {
    if (!pair.tokenA || !pair.tokenB) {
      return
    }
    const tokenA = ratioSwitcher ? ratio.tokenA : ratio.tokenB
    const tokenALabel = ratioSwitcher ? pair.tokenA.name : pair.tokenB.name
    const tokenB = ratioSwitcher ? ratio.tokenB : ratio.tokenA
    const tokenBLabel = ratioSwitcher ? pair.tokenB.name : pair.tokenA.name
    return (
      <label
        className='rate-info'
        onClick={() => {
          setRatioSwitcher(!ratioSwitcher)
        }}
      >
        <label className='number'>
          {!tokenA || new BigNumber(tokenA).eq(0)
            ? '-'
            : new BigNumber(tokenA)
                .div(tokenA)
                .decimalPlaces(ROUNDED_NUMBER)
                .toString()}
        </label>{' '}
        {tokenALabel} ={' '}
        <label className='number'>
          {!tokenA || new BigNumber(tokenA).eq(0)
            ? '-'
            : new BigNumber(tokenB)
                .div(tokenA)
                .decimalPlaces(ROUNDED_NUMBER)
                .toString()}
        </label>{' '}
        {tokenBLabel}
      </label>
    )
  }

  const onTokenClick = (
    exclude: string[],
    slot: keyof typeof pair,
    title: string
  ) => {
    props.setTokenSelector({
      show: true,
      callback: (token) => {
        setPair({
          ...pair,
          [slot]: token,
        })
        onTokenChange(slot, token)
        resetForm(title)
        props.setTokenSelector({
          show: false,
          exclude: [],
        })
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
  console.log(pooled.tokenA.toFormat(), pooled.tokenB.toFormat())
  const tabs: Tab[] = [
    {
      title: 'Add',
      child: (
        <div className='form-content-container'>
          <WalletStatus callback={async () => {}} />
          <div className='pool-amount-input'>
            <AmountInput
              onTokenClick={(token) => {
                onTokenClick(
                  pair.tokenB ? [pair.tokenB?.name] : [],
                  'tokenA',
                  'Supply'
                )
              }}
              balance={info.tokenA.balance}
              decimals={info.tokenA.decimals}
              token={pair.tokenA}
              value={form.add.tokenA.value}
              placeholder='0.0'
              onChange={(value) => {
                onChangeAmountA(
                  'Supply',
                  form.add,
                  value,
                  info.tokenA.balance,
                  info.tokenB.balance
                )
              }}
              style={{ marginBottom: 0 }}
              showBalanceInfo
            />
            <img className='plus-icon' src={plusIcon} />
          </div>
          <AmountInput
            onTokenClick={(token) => {
              onTokenClick(
                pair.tokenA ? [pair.tokenA?.name] : [],
                'tokenB',
                'Supply'
              )
            }}
            balance={info.tokenB.balance}
            decimals={info.tokenB.decimals}
            token={pair.tokenB}
            value={form.add.tokenB.value}
            placeholder='0.0'
            onChange={(value) => {
              onChangeAmountB(
                'Supply',
                form.add,
                value,
                info.tokenA.balance,
                info.tokenB.balance
              )
            }}
            showBalanceInfo
          />
          {poolHasDeposited && ratio.tokenA && ratio.tokenB && (
            <div className='rate-container'>
              <label className='rate-info'>Rate</label>
              {renderRatio()}
            </div>
          )}
          {info.tokenA.needApprove && pair.tokenA && (
            <Button
              type='button'
              value={`Approve ${pair.tokenA.name}`}
              onClick={async () => {
                approve('tokenA')
              }}
            />
          )}
          {info.tokenB.needApprove && pair.tokenB && (
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
            value={form.add.title}
            onClick={supply}
            disabled={!form.add.tokenA.valid || !form.add.tokenB.valid}
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
              // onTokenClick(
              //   pair.tokenA ? [pair.tokenA?.name] : [],
              //   'tokenB',
              //   'Supply'
              // )
            }}
            balance={pooled.lp}
            decimals={info.tokenA.decimals}
            token={{
              name:
                pair.tokenA?.name && pair.tokenB?.name
                  ? `${pair.tokenA.name} / ${pair.tokenB.name}`
                  : '',
              logo: pair.tokenA?.logo,
              address: pair.tokenA?.address,
            }}
            value={form.remove.tokenA.value}
            placeholder='0.0'
            onChange={(value) => {
              onChangeAmountA(
                'Withdraw',
                form.remove,
                value,
                pooled.tokenA,
                pooled.tokenB
              )
            }}
            style={{ marginBottom: 0 }}
            showBalanceInfo
          />
          {/* {poolHasDeposited && ratio.tokenA && ratio.tokenB && (
            <div className='rate-container'>
              <label className='rate-info'>Rate</label>
              {renderRatio()}
            </div>
          )} */}
          {/* <Button
            type='button'
            value={form.remove.title}
            onClick={withdraw}
            disabled={!form.remove.tokenA.valid}
          /> */}
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
