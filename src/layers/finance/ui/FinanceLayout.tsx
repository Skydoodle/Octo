import { NavLink, Outlet } from "react-router-dom";
import { useCompanies } from "../../../company/companyContext";

const links = [["/dashboard/finans", "Genel Bakış"], ["/dashboard/finans/alacaklar", "Alacaklar"], ["/dashboard/finans/faturalar", "Faturalar"], ["/dashboard/finans/tahsilatlar", "Tahsilatlar"], ["/dashboard/finans/hesaplar", "Hesaplar"]] as const;
export default function FinanceLayout() {
  const { activeCompany } = useCompanies();
  return <div className="space-y-5"><header><div className="label text-crimson">İşletme</div><h1 className="mt-1 font-display text-4xl font-semibold text-ink">Finans</h1><p className="mt-2 text-sm text-ink-soft">{activeCompany?.name} için alacak, fatura ve tahsilat kayıtları.</p></header><nav aria-label="Finans bölümleri" className="flex gap-1 overflow-x-auto border-b border-line">{links.map(([to,label],index)=><NavLink key={to} to={to} end={index===0} className={({isActive})=>`focus-ring whitespace-nowrap border-b-2 px-3 py-2 text-sm ${isActive?'border-crimson text-crimson':'border-transparent text-ink-soft hover:text-ink'}`}>{label}</NavLink>)}</nav><Outlet /></div>;
}
