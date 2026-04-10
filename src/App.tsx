import React, { useState, useMemo } from 'react';
import { 
  Calculator, 
  Info, 
  TrendingUp, 
  PieChart as PieChartIcon, 
  Table as TableIcon,
  ChevronDown,
  ChevronUp,
  Percent,
  Calendar,
  Wallet,
  Zap
} from 'lucide-react';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Tooltip, 
  Legend,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';

type RepaymentType = 'equal-installment' | 'equal-principal';
type PrepaymentStrategy = 'reduce-monthly' | 'shorten-term';
type LoanType = 'commercial' | 'provident' | 'combined';

interface RepaymentDetail {
  month: number;
  payment: number;
  principal: number;
  interest: number;
  remainingBalance: number;
  isPrepayment?: boolean;
}

export default function App() {
  // Inputs
  const [loanType, setLoanType] = useState<LoanType>('commercial');
  const [loanAmount, setLoanAmount] = useState<number>(100); // Commercial loan in 10k CNY
  const [providentAmount, setProvidentAmount] = useState<number>(50); // Provident fund loan in 10k CNY
  const [interestRate, setInterestRate] = useState<number>(3.5); // Commercial rate
  const [providentRate, setProvidentRate] = useState<number>(2.85); // Provident fund rate
  const [loanTermComm, setLoanTermComm] = useState<number>(30); // years
  const [loanTermProv, setLoanTermProv] = useState<number>(30); // years
  const [repaymentType, setRepaymentType] = useState<RepaymentType>('equal-installment');
  
  // Prepayment Inputs
  const [hasPrepayment, setHasPrepayment] = useState(false);
  const [prepaymentAmount, setPrepaymentAmount] = useState<number>(10); // in 10k CNY
  const [prepaymentMonth, setPrepaymentMonth] = useState<number>(12); // after 12 months
  const [prepaymentStrategy, setPrepaymentStrategy] = useState<PrepaymentStrategy>('shorten-term');

  // UI State
  const [showSchedule, setShowSchedule] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 12;

  // Reset page when loan parameters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [loanType, loanAmount, providentAmount, interestRate, providentRate, loanTermComm, loanTermProv, repaymentType, hasPrepayment, prepaymentAmount, prepaymentMonth, prepaymentStrategy]);

  // Calculations
  const results = useMemo(() => {
    const totalMonthsComm = loanTermComm * 12;
    const totalMonthsProv = loanTermProv * 12;
    const maxMonths = Math.max(totalMonthsComm, totalMonthsProv);
    
    const monthlyRateComm = interestRate / 100 / 12;
    const monthlyRateProv = providentRate / 100 / 12;
    
    const principalComm = (loanType === 'commercial' || loanType === 'combined') ? loanAmount * 10000 : 0;
    const principalProv = (loanType === 'provident' || loanType === 'combined') ? providentAmount * 10000 : 0;
    const totalPrincipal = principalComm + principalProv;
    
    const prepayAmount = prepaymentAmount * 10000;
    
    let schedule: RepaymentDetail[] = [];
    let totalInterest = 0;
    let balanceComm = principalComm;
    let balanceProv = principalProv;

    // Initial monthly payments
    let initialMonthlyComm = 0;
    let initialMonthlyProv = 0;

    if (repaymentType === 'equal-installment') {
      if (principalComm > 0) {
        initialMonthlyComm = monthlyRateComm === 0 ? principalComm / totalMonthsComm : (principalComm * monthlyRateComm * Math.pow(1 + monthlyRateComm, totalMonthsComm)) / (Math.pow(1 + monthlyRateComm, totalMonthsComm) - 1);
      }
      if (principalProv > 0) {
        initialMonthlyProv = monthlyRateProv === 0 ? principalProv / totalMonthsProv : (principalProv * monthlyRateProv * Math.pow(1 + monthlyRateProv, totalMonthsProv)) / (Math.pow(1 + monthlyRateProv, totalMonthsProv) - 1);
      }
    }

    let currentMonthlyComm = initialMonthlyComm;
    let currentMonthlyProv = initialMonthlyProv;
    let monthsElapsed = 0;

    for (let i = 1; i <= maxMonths; i++) {
      if (balanceComm <= 0 && balanceProv <= 0) break;

      let interestComm = i <= totalMonthsComm ? balanceComm * monthlyRateComm : 0;
      let interestProv = i <= totalMonthsProv ? balanceProv * monthlyRateProv : 0;
      
      let principalPayComm = 0;
      let principalPayProv = 0;

      if (repaymentType === 'equal-installment') {
        if (balanceComm > 0 && i <= totalMonthsComm) principalPayComm = Math.min(balanceComm, currentMonthlyComm - interestComm);
        if (balanceProv > 0 && i <= totalMonthsProv) principalPayProv = Math.min(balanceProv, currentMonthlyProv - interestProv);
      } else {
        if (balanceComm > 0 && i <= totalMonthsComm) principalPayComm = Math.min(balanceComm, principalComm / totalMonthsComm);
        if (balanceProv > 0 && i <= totalMonthsProv) principalPayProv = Math.min(balanceProv, principalProv / totalMonthsProv);
      }

      balanceComm -= principalPayComm;
      balanceProv -= principalPayProv;
      
      const totalMonthPrincipal = principalPayComm + principalPayProv;
      const totalMonthInterest = interestComm + interestProv;
      const totalMonthPayment = totalMonthPrincipal + totalMonthInterest;

      totalInterest += totalMonthInterest;
      monthsElapsed++;

      schedule.push({
        month: i,
        payment: totalMonthPayment,
        principal: totalMonthPrincipal,
        interest: totalMonthInterest,
        remainingBalance: Math.max(0, balanceComm + balanceProv)
      });

      // Handle Prepayment (Simplified: apply to commercial first, then provident)
      if (hasPrepayment && i === prepaymentMonth && (balanceComm > 0 || balanceProv > 0)) {
        let remainingPrepay = Math.min(balanceComm + balanceProv, prepayAmount);
        const actualPrepayTotal = remainingPrepay;
        
        let prepayComm = Math.min(balanceComm, remainingPrepay);
        balanceComm -= prepayComm;
        remainingPrepay -= prepayComm;
        
        let prepayProv = Math.min(balanceProv, remainingPrepay);
        balanceProv -= prepayProv;

        schedule.push({
          month: i,
          payment: actualPrepayTotal,
          principal: actualPrepayTotal,
          interest: 0,
          remainingBalance: Math.max(0, balanceComm + balanceProv),
          isPrepayment: true
        });

        if (prepaymentStrategy === 'reduce-monthly') {
          const remainingMonthsComm = totalMonthsComm - i;
          const remainingMonthsProv = totalMonthsProv - i;
          
          if (repaymentType === 'equal-installment') {
            if (balanceComm > 0 && remainingMonthsComm > 0) {
              currentMonthlyComm = monthlyRateComm === 0 ? balanceComm / remainingMonthsComm : (balanceComm * monthlyRateComm * Math.pow(1 + monthlyRateComm, remainingMonthsComm)) / (Math.pow(1 + monthlyRateComm, remainingMonthsComm) - 1);
            } else {
              currentMonthlyComm = 0;
            }
            if (balanceProv > 0 && remainingMonthsProv > 0) {
              currentMonthlyProv = monthlyRateProv === 0 ? balanceProv / remainingMonthsProv : (balanceProv * monthlyRateProv * Math.pow(1 + monthlyRateProv, remainingMonthsProv)) / (Math.pow(1 + monthlyRateProv, remainingMonthsProv) - 1);
            } else {
              currentMonthlyProv = 0;
            }
          }
        }
      }
    }

    const totalPayment = totalPrincipal + totalInterest;

    // Baseline calculation (Simplified)
    let baselineInterest = 0;
    const calcBaseline = (p: number, rate: number, term: number) => {
      if (p <= 0) return 0;
      const mRate = rate / 100 / 12;
      const tMonths = term * 12;
      let b = p;
      let interestSum = 0;
      if (repaymentType === 'equal-installment') {
        const mPay = mRate === 0 ? p / tMonths : (p * mRate * Math.pow(1 + mRate, tMonths)) / (Math.pow(1 + mRate, tMonths) - 1);
        for (let i = 0; i < tMonths; i++) {
          const interest = b * mRate;
          interestSum += interest;
          b -= (mPay - interest);
          if (b <= 0) break;
        }
      } else {
        const mP = p / tMonths;
        for (let i = 0; i < tMonths; i++) {
          interestSum += b * mRate;
          b -= mP;
          if (b <= 0) break;
        }
      }
      return interestSum;
    };
    baselineInterest = calcBaseline(principalComm, interestRate, loanTermComm) + calcBaseline(principalProv, providentRate, loanTermProv);

    return {
      monthlyPayment: currentMonthlyComm + currentMonthlyProv,
      totalInterest,
      totalPayment,
      principalAmount: totalPrincipal,
      schedule,
      interestSaved: Math.max(0, baselineInterest - totalInterest),
      monthsSaved: maxMonths - monthsElapsed,
      originalTotalMonths: maxMonths,
      actualTotalMonths: monthsElapsed
    };
  }, [loanType, loanAmount, providentAmount, interestRate, providentRate, loanTermComm, loanTermProv, repaymentType, hasPrepayment, prepaymentAmount, prepaymentMonth, prepaymentStrategy]);

  const pieData = [
    { name: '本金', value: results.principalAmount, color: '#0ea5e9' },
    { name: '利息', value: results.totalInterest, color: '#f43f5e' },
  ];

  const chartData = results.schedule.filter((item) => !item.isPrepayment && (item.month % 12 === 0 || item.month === results.schedule[results.schedule.length - 1].month)).map(item => ({
    year: Math.ceil(item.month / 12),
    balance: Math.round(item.remainingBalance / 10000),
    interest: Math.round(item.interest),
    principal: Math.round(item.principal)
  }));

  const totalPages = Math.ceil(results.schedule.length / pageSize);
  const paginatedSchedule = results.schedule.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY', maximumFractionDigits: 0 }).format(val);
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans selection:bg-sky-100 pb-12">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-sky-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-sky-200">
              <Calculator size={24} />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">房贷计算器 <span className="text-xs font-normal text-slate-400 ml-2">Pro</span></h1>
          </div>
          <div className="text-sm font-medium text-slate-500 hidden sm:block">
            专业、精准的贷款分析工具
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Column: Inputs */}
          <div className="lg:col-span-4 space-y-6">
            <section className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200">
              <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-6 flex items-center gap-2">
                <Info size={16} /> 贷款参数设置
              </h2>
              
              <div className="space-y-6">
                {/* Loan Type */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">贷款方式</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'commercial', label: '商贷' },
                      { id: 'provident', label: '公积金' },
                      { id: 'combined', label: '组合贷' }
                    ].map(type => (
                      <button 
                        key={type.id}
                        onClick={() => setLoanType(type.id as LoanType)}
                        className={cn(
                          "py-2 px-1 rounded-xl text-xs font-medium border transition-all",
                          loanType === type.id 
                            ? "bg-sky-600 border-sky-600 text-white shadow-md shadow-sky-100" 
                            : "bg-white border-slate-200 text-slate-600 hover:border-sky-300"
                        )}
                      >
                        {type.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Commercial Loan Amount */}
                {(loanType === 'commercial' || loanType === 'combined') && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700 flex justify-between">
                      <span>{loanType === 'combined' ? '商贷金额' : '贷款总额'}</span>
                      <span className="text-sky-600 font-bold">{loanAmount} 万元</span>
                    </label>
                    <div className="relative">
                      <input 
                        type="range" 
                        min="10" 
                        max="1000" 
                        step="10"
                        value={loanAmount}
                        onChange={(e) => setLoanAmount(Number(e.target.value))}
                        className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-sky-600"
                      />
                    </div>
                    <div className="relative mt-2">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <Wallet size={16} />
                      </div>
                      <input 
                        type="number"
                        value={loanAmount}
                        onChange={(e) => setLoanAmount(Number(e.target.value))}
                        className="block w-full pl-10 pr-12 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-all"
                      />
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400 text-xs">
                        万元
                      </div>
                    </div>
                  </div>
                )}

                {/* Provident Fund Amount */}
                {(loanType === 'provident' || loanType === 'combined') && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700 flex justify-between">
                      <span>{loanType === 'combined' ? '公积金金额' : '贷款总额'}</span>
                      <span className="text-sky-600 font-bold">{providentAmount} 万元</span>
                    </label>
                    <div className="relative">
                      <input 
                        type="range" 
                        min="5" 
                        max="200" 
                        step="5"
                        value={providentAmount}
                        onChange={(e) => setProvidentAmount(Number(e.target.value))}
                        className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-sky-600"
                      />
                    </div>
                    <div className="relative mt-2">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <Wallet size={16} />
                      </div>
                      <input 
                        type="number"
                        value={providentAmount}
                        onChange={(e) => setProvidentAmount(Number(e.target.value))}
                        className="block w-full pl-10 pr-12 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-all"
                      />
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400 text-xs">
                        万元
                      </div>
                    </div>
                  </div>
                )}

                {/* Commercial Interest Rate */}
                {(loanType === 'commercial' || loanType === 'combined') && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700 flex justify-between">
                      <span>商贷利率 (LPR)</span>
                      <span className="text-sky-600 font-bold">{interestRate}%</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <Percent size={16} />
                      </div>
                      <input 
                        type="number"
                        step="0.01"
                        value={interestRate}
                        onChange={(e) => setInterestRate(Number(e.target.value))}
                        className="block w-full pl-10 pr-12 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-all"
                      />
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400 text-xs">
                        %
                      </div>
                    </div>
                  </div>
                )}

                {/* Provident Fund Interest Rate */}
                {(loanType === 'provident' || loanType === 'combined') && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700 flex justify-between">
                      <span>公积金利率</span>
                      <span className="text-sky-600 font-bold">{providentRate}%</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <Percent size={16} />
                      </div>
                      <input 
                        type="number"
                        step="0.01"
                        value={providentRate}
                        onChange={(e) => setProvidentRate(Number(e.target.value))}
                        className="block w-full pl-10 pr-12 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-all"
                      />
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400 text-xs">
                        %
                      </div>
                    </div>
                  </div>
                )}

                {/* Loan Term */}
                <div className="space-y-4">
                  {(loanType === 'commercial' || loanType === 'combined') && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700 flex justify-between">
                        <span>{loanType === 'combined' ? '商贷期限' : '贷款期限'}</span>
                        <span className="text-sky-600 font-bold">{loanTermComm} 年</span>
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                          <Calendar size={16} />
                        </div>
                        <select 
                          value={loanTermComm}
                          onChange={(e) => setLoanTermComm(Number(e.target.value))}
                          className="block w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm appearance-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-all"
                        >
                          {[5, 10, 15, 20, 25, 30].map(year => (
                            <option key={year} value={year}>{year} 年 ({year * 12} 期)</option>
                          ))}
                        </select>
                        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
                          <ChevronDown size={16} />
                        </div>
                      </div>
                    </div>
                  )}

                  {(loanType === 'provident' || loanType === 'combined') && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700 flex justify-between">
                        <span>{loanType === 'combined' ? '公积金期限' : '贷款期限'}</span>
                        <span className="text-sky-600 font-bold">{loanTermProv} 年</span>
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                          <Calendar size={16} />
                        </div>
                        <select 
                          value={loanTermProv}
                          onChange={(e) => setLoanTermProv(Number(e.target.value))}
                          className="block w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm appearance-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-all"
                        >
                          {[5, 10, 15, 20, 25, 30].map(year => (
                            <option key={year} value={year}>{year} 年 ({year * 12} 期)</option>
                          ))}
                        </select>
                        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
                          <ChevronDown size={16} />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Repayment Type */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">还款方式</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button 
                      onClick={() => setRepaymentType('equal-installment')}
                      className={cn(
                        "py-3 px-4 rounded-xl text-sm font-medium border transition-all",
                        repaymentType === 'equal-installment' 
                          ? "bg-sky-600 border-sky-600 text-white shadow-md shadow-sky-100" 
                          : "bg-white border-slate-200 text-slate-600 hover:border-sky-300"
                      )}
                    >
                      等额本息
                    </button>
                    <button 
                      onClick={() => setRepaymentType('equal-principal')}
                      className={cn(
                        "py-3 px-4 rounded-xl text-sm font-medium border transition-all",
                        repaymentType === 'equal-principal' 
                          ? "bg-sky-600 border-sky-600 text-white shadow-md shadow-sky-100" 
                          : "bg-white border-slate-200 text-slate-600 hover:border-sky-300"
                      )}
                    >
                      等额本金
                    </button>
                  </div>
                </div>
              </div>
            </section>

            {/* Prepayment Section */}
            <section className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                  <Zap size={16} className="text-amber-500" /> 提前还款计划
                </h2>
                <button 
                  onClick={() => setHasPrepayment(!hasPrepayment)}
                  className={cn(
                    "relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none",
                    hasPrepayment ? "bg-sky-600" : "bg-slate-200"
                  )}
                >
                  <span className={cn(
                    "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                    hasPrepayment ? "translate-x-6" : "translate-x-1"
                  )} />
                </button>
              </div>

              <AnimatePresence>
                {hasPrepayment && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="space-y-6 overflow-hidden"
                  >
                    {/* Prepay Amount */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700 flex justify-between">
                        <span>提前还款金额</span>
                        <span className="text-amber-600 font-bold">{prepaymentAmount} 万元</span>
                      </label>
                      <div className="relative">
                        <input 
                          type="number"
                          value={prepaymentAmount}
                          onChange={(e) => setPrepaymentAmount(Number(e.target.value))}
                          className="block w-full pl-4 pr-12 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all"
                        />
                        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400 text-xs">
                          万元
                        </div>
                      </div>
                    </div>

                    {/* Prepay Time */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700">还款时间 (第几期后)</label>
                      <div className="relative">
                        <select 
                          value={prepaymentMonth}
                          onChange={(e) => setPrepaymentMonth(Number(e.target.value))}
                          className="block w-full pl-4 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm appearance-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all"
                        >
                          {Array.from({ length: Math.max(loanTermComm, loanTermProv) }, (_, i) => (i + 1) * 12).map(month => (
                            <option key={month} value={month}>第 {month / 12} 年末 (第 {month} 期)</option>
                          ))}
                        </select>
                        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
                          <ChevronDown size={16} />
                        </div>
                      </div>
                    </div>

                    {/* Prepay Strategy */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700">处理方式</label>
                      <div className="grid grid-cols-1 gap-3">
                        <button 
                          onClick={() => setPrepaymentStrategy('shorten-term')}
                          className={cn(
                            "py-3 px-4 rounded-xl text-sm font-medium border text-left transition-all flex items-center justify-between",
                            prepaymentStrategy === 'shorten-term' 
                              ? "bg-amber-50 border-amber-500 text-amber-900" 
                              : "bg-white border-slate-200 text-slate-600 hover:border-amber-300"
                          )}
                        >
                          <span>月供不变，缩短期限</span>
                          {prepaymentStrategy === 'shorten-term' && <Zap size={14} className="text-amber-500" />}
                        </button>
                        <button 
                          onClick={() => setPrepaymentStrategy('reduce-monthly')}
                          className={cn(
                            "py-3 px-4 rounded-xl text-sm font-medium border text-left transition-all flex items-center justify-between",
                            prepaymentStrategy === 'reduce-monthly' 
                              ? "bg-amber-50 border-amber-500 text-amber-900" 
                              : "bg-white border-slate-200 text-slate-600 hover:border-amber-300"
                          )}
                        >
                          <span>期限不变，减少月供</span>
                          {prepaymentStrategy === 'reduce-monthly' && <Zap size={14} className="text-amber-500" />}
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </section>
          </div>

          {/* Right Column: Results & Charts */}
          <div className="lg:col-span-8 space-y-8">
            
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <motion.div 
                layout
                className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm"
              >
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">每月还款</p>
                <p className="text-2xl font-bold text-slate-900">
                  {formatCurrency(results.monthlyPayment)}
                  {repaymentType === 'equal-principal' && <span className="text-xs text-slate-400 font-normal block mt-1">首月 (逐月递减)</span>}
                </p>
              </motion.div>
              <motion.div 
                layout
                className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm"
              >
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">利息总额</p>
                <p className="text-2xl font-bold text-rose-500">{formatCurrency(results.totalInterest)}</p>
              </motion.div>
              <motion.div 
                layout
                className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm"
              >
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">还款总额</p>
                <p className="text-2xl font-bold text-slate-900">{formatCurrency(results.totalPayment)}</p>
              </motion.div>
            </div>

            {/* Prepayment Impact Card */}
            {hasPrepayment && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-amber-50 border border-amber-200 rounded-3xl p-6 flex flex-col md:flex-row items-center gap-6"
              >
                <div className="w-16 h-16 bg-amber-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-amber-200 flex-shrink-0">
                  <Zap size={32} />
                </div>
                <div className="flex-grow space-y-2 text-center md:text-left">
                  <h3 className="text-lg font-bold text-amber-900">提前还款成效分析</h3>
                  <div className="flex flex-wrap gap-4 justify-center md:justify-start">
                    <div className="bg-white/50 px-4 py-2 rounded-xl border border-amber-200">
                      <span className="text-xs text-amber-700 block">节省利息支出</span>
                      <span className="text-xl font-bold text-rose-600">{formatCurrency(results.interestSaved)}</span>
                    </div>
                    {prepaymentStrategy === 'shorten-term' && (
                      <div className="bg-white/50 px-4 py-2 rounded-xl border border-amber-200">
                        <span className="text-xs text-amber-700 block">缩短还款期限</span>
                        <span className="text-xl font-bold text-amber-900">{Math.floor(results.monthsSaved / 12)} 年 {results.monthsSaved % 12} 个月</span>
                      </div>
                    )}
                    <div className="bg-white/50 px-4 py-2 rounded-xl border border-amber-200">
                      <span className="text-xs text-amber-700 block">实际还款期数</span>
                      <span className="text-xl font-bold text-amber-900">{results.actualTotalMonths} 期</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Charts Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Pie Chart */}
              <section className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
                <h3 className="text-sm font-semibold text-slate-900 mb-6 flex items-center gap-2">
                  <PieChartIcon size={16} className="text-sky-600" /> 还款构成分析
                </h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value: number) => formatCurrency(value)}
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                      />
                      <Legend verticalAlign="bottom" height={36} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </section>

              {/* Area Chart */}
              <section className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
                <h3 className="text-sm font-semibold text-slate-900 mb-6 flex items-center gap-2">
                  <TrendingUp size={16} className="text-sky-600" /> 剩余本金趋势 (万元)
                </h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="year" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                      <Tooltip 
                        formatter={(value: number) => [`${value} 万元`, '剩余本金']}
                        labelFormatter={(label) => `第 ${label} 年`}
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                      />
                      <Area type="monotone" dataKey="balance" stroke="#0ea5e9" fillOpacity={1} fill="url(#colorBalance)" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </section>
            </div>

            {/* Schedule Table */}
            <section className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
              <button 
                onClick={() => setShowSchedule(!showSchedule)}
                className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <TableIcon size={18} className="text-sky-600" />
                  <span className="font-semibold text-slate-900">还款计划详情</span>
                </div>
                {showSchedule ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
              </button>
              
              <AnimatePresence>
                {showSchedule && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-500 font-medium uppercase text-[10px] tracking-wider">
                          <tr>
                            <th className="px-6 py-3">期数</th>
                            <th className="px-6 py-3">还款额</th>
                            <th className="px-6 py-3">本金</th>
                            <th className="px-6 py-3">利息</th>
                            <th className="px-6 py-3">剩余本金</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {paginatedSchedule.map((item, idx) => (
                            <tr key={`${item.month}-${idx}`} className={cn(
                              "hover:bg-slate-50/50 transition-colors",
                              item.isPrepayment ? "bg-amber-50" : ""
                            )}>
                              <td className="px-6 py-3 font-mono text-slate-400">
                                {item.isPrepayment ? <span className="text-amber-600 font-bold">提前还款</span> : `第 ${item.month} 期`}
                              </td>
                              <td className="px-6 py-3 font-semibold text-slate-700">
                                {formatCurrency(item.payment)}
                              </td>
                              <td className="px-6 py-3 text-slate-600">{formatCurrency(item.principal)}</td>
                              <td className="px-6 py-3 text-rose-400">{formatCurrency(item.interest)}</td>
                              <td className="px-6 py-3 text-slate-500">{formatCurrency(item.remainingBalance)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Pagination Controls */}
                    <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                      <div className="text-xs text-slate-500">
                        共 {results.schedule.length} 条记录，第 {currentPage} / {totalPages} 页
                      </div>
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                          disabled={currentPage === 1}
                          className="p-2 rounded-lg border border-slate-200 bg-white text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors"
                        >
                          <ChevronUp className="-rotate-90" size={16} />
                        </button>
                        
                        <div className="flex items-center gap-1">
                          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                            let pageNum = currentPage;
                            if (totalPages <= 5) {
                              pageNum = i + 1;
                            } else {
                              if (currentPage <= 3) pageNum = i + 1;
                              else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i;
                              else pageNum = currentPage - 2 + i;
                            }
                            
                            return (
                              <button
                                key={pageNum}
                                onClick={() => setCurrentPage(pageNum)}
                                className={cn(
                                  "w-8 h-8 rounded-lg text-xs font-medium transition-all",
                                  currentPage === pageNum 
                                    ? "bg-sky-600 text-white shadow-sm" 
                                    : "bg-white border border-slate-200 text-slate-600 hover:border-sky-300"
                                )}
                              >
                                {pageNum}
                              </button>
                            );
                          })}
                        </div>

                        <button 
                          onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                          disabled={currentPage === totalPages}
                          className="p-2 rounded-lg border border-slate-200 bg-white text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors"
                        >
                          <ChevronDown className="-rotate-90" size={16} />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </section>

            {/* Footer Info */}
            <div className="flex items-center gap-4 p-6 bg-slate-100 rounded-3xl text-slate-500 text-xs leading-relaxed">
              <Info size={24} className="flex-shrink-0 text-slate-400" />
              <p>
                注：计算结果仅供参考。提前还款可能涉及银行违约金或手续费，具体请咨询贷款银行。
                本计算器假设提前还款后立即生效，且不考虑复利计算差异。
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
