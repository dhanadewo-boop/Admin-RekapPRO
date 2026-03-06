import { useEffect, useState } from 'react';
// Penyesuaian path import sesuai struktur folder lib/supabase.js
import { supabase } from "../lib/supabase";

export default function RekapTarget() {
    const [tabAktif, setTabAktif] = useState('global'); // global, bulanan, customer
    const [dataGlobal, setDataGlobal] = useState([]);
    const [dataBulanan, setDataBulanan] = useState([]);
    const [dataCustomer, setDataCustomer] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchAllData();
    }, []);

    const fetchAllData = async () => {
        setLoading(true);
        try {
            // 1. Ambil Data Global (All-Time)
            const { data: global } = await supabase.from('v_rekap_grup_produk').select('*');

            // 2. Ambil Data Bulanan
            const { data: bulanan } = await supabase
                .from('v_rekap_bulanan_grup')
                .select('*')
                .order('tahun', { ascending: false })
                .order('bulan', { ascending: false });

            // 3. Ambil Data Pencapaian Customer
            const { data: customer } = await supabase.from('v_pencapaian_target_customer').select('*');

            if (global) setDataGlobal(global);
            if (bulanan) setDataBulanan(bulanan);
            if (customer) setDataCustomer(customer);
        } catch (error) {
            console.error("Gagal memuat data:", error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
                <p className="text-gray-500 font-medium">Menghitung data analitik...</p>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-8 bg-gray-50 min-h-screen">
            <div className="max-w-7xl mx-auto">
                <header className="mb-8">
                    <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Admin-RekapPRO Analitik</h1>
                    <p className="text-gray-600 mt-2">Laporan otomatis kontribusi produk dan pencapaian target customer secara real-time.</p>
                </header>

                {/* Menu Navigasi Tab */}
                <div className="flex space-x-1 mb-6 bg-gray-200 p-1 rounded-xl w-fit">
                    {['global', 'bulanan', 'customer'].map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setTabAktif(tab)}
                            className={`px-6 py-2.5 text-sm font-bold rounded-lg transition-all duration-200 ${tabAktif === tab
                                    ? 'bg-white text-blue-600 shadow-sm'
                                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-300'
                                }`}
                        >
                            {tab === 'global' && 'Kontribusi Global'}
                            {tab === 'bulanan' && 'Rekap Bulanan'}
                            {tab === 'customer' && 'Target per Customer'}
                        </button>
                    ))}
                </div>

                {/* Konten Tab 1: Global */}
                {tabAktif === 'global' && (
                    <div className="bg-white shadow-sm border border-gray-200 rounded-xl overflow-hidden">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Grup Produk</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Total Dus</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Tonase/Liter</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Total Omset</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {dataGlobal.map((item, i) => (
                                    <tr key={i} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 font-bold text-gray-900">{item.grup_target}</td>
                                        <td className="px-6 py-4 text-gray-600">{item.total_dus.toLocaleString('id-ID')} Dus</td>
                                        <td className="px-6 py-4 text-gray-600">{item.total_konversi.toLocaleString('id-ID')} {item.satuan_tampil}</td>
                                        <td className="px-6 py-4 text-green-600 font-bold font-mono">
                                            Rp {Number(item.total_omset).toLocaleString('id-ID')}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Konten Tab 2: Bulanan */}
                {tabAktif === 'bulanan' && (
                    <div className="bg-white shadow-sm border border-gray-200 rounded-xl overflow-hidden">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Periode</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Grup</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Realisasi Dus</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Omset</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {dataBulanan.map((item, i) => (
                                    <tr key={i} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 text-gray-900 font-medium">Bulan {item.bulan} - {item.tahun}</td>
                                        <td className="px-6 py-4 font-bold text-blue-600">{item.grup_target}</td>
                                        <td className="px-6 py-4 text-gray-600">{item.total_dus.toLocaleString('id-ID')} Dus</td>
                                        <td className="px-6 py-4 text-gray-900 font-semibold font-mono">
                                            Rp {Number(item.total_omset).toLocaleString('id-ID')}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Konten Tab 3: Target Customer */}
                {tabAktif === 'customer' && (
                    <div className="bg-white shadow-sm border border-gray-200 rounded-xl overflow-hidden">
                        {dataCustomer.length === 0 ? (
                            <div className="p-20 text-center">
                                <p className="text-gray-400 italic text-lg">Belum ada data target yang di-input ke tabel customer_targets.</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200 text-sm">
                                    <thead className="bg-gray-800 text-white">
                                        <tr>
                                            <th className="px-4 py-4 text-left font-bold uppercase tracking-wider">Nama Customer</th>
                                            <th className="px-4 py-4 text-left font-bold uppercase tracking-wider">Grup</th>
                                            <th className="px-4 py-4 text-center font-bold uppercase tracking-wider">Target</th>
                                            <th className="px-4 py-4 text-center font-bold uppercase tracking-wider">Realisasi</th>
                                            <th className="px-4 py-4 text-center font-bold uppercase tracking-wider">Sisa</th>
                                            <th className="px-4 py-4 text-center font-bold uppercase tracking-wider">Pencapaian</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {dataCustomer.map((item, i) => (
                                            <tr key={i} className="hover:bg-blue-50 transition-colors cursor-default">
                                                <td className="px-4 py-4 font-extrabold text-gray-900">{item.nama_customer}</td>
                                                <td className="px-4 py-4 text-blue-600 font-medium">{item.grup_target}</td>
                                                <td className="px-4 py-4 text-center font-mono">{item.target_dus.toLocaleString('id-ID')}</td>
                                                <td className="px-4 py-4 text-center font-bold text-blue-700 font-mono">{item.realisasi_dus.toLocaleString('id-ID')}</td>
                                                <td className={`px-4 py-4 text-center font-mono ${item.sisa_target_dus > 0 ? 'text-red-500' : 'text-green-600 font-bold'}`}>
                                                    {item.sisa_target_dus <= 0 ? 'LUNAS' : item.sisa_target_dus.toLocaleString('id-ID')}
                                                </td>
                                                <td className="px-4 py-4 text-center">
                                                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-black shadow-sm ${item.persentase_capaian >= 100
                                                            ? 'bg-green-500 text-white'
                                                            : item.persentase_capaian >= 50
                                                                ? 'bg-yellow-400 text-gray-900'
                                                                : 'bg-red-100 text-red-700 border border-red-200'
                                                        }`}>
                                                        {item.persentase_capaian}%
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}