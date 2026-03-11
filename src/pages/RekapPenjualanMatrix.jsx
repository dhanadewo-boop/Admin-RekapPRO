import { useEffect, useState } from 'react';
import { supabase } from "../lib/supabase";
import { getAllProducts, matchProduct } from "../lib/masterData";

export default function RekapPenjualanMatrix() {
    const [data, setData] = useState({ pupuk: [], pestisida: [] });
    const [loading, setLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState("");

    const namaBulan = ["JANUARI", "FEBRUARI", "MARET", "APRIL", "MEI", "JUNI", "JULI", "AGUSTUS", "SEPTEMBER", "OKTOBER", "NOVEMBER", "DESEMBER"];
    const tahunAktif = 2026;

    useEffect(() => {
        fetchMatrixData();
    }, []);

    const isPupuk = (name) => {
        const lowerName = name.toLowerCase();
        const pupukKeywords = ['osmocote', 'gandapan', 'gandasil', 'mikrofid', 'dekorgan', 'gandastar', 'mastofol', 'pupuk'];
        return pupukKeywords.some(kw => lowerName.includes(kw));
    };

    const fetchMatrixData = async () => {
        setLoading(true);
        try {
            const startDate = `${tahunAktif}-01-01`;
            const endDate = `${tahunAktif}-12-31`;

            // Fetch invoices to get IDs and Months
            const { data: invoices, error: invError } = await supabase
                .from('invoices')
                .select('id, invoice_date')
                .ilike('invoice_date', `%${tahunAktif}%`)
                .neq('status', 'cancelled');

            if (invError) throw invError;
            if (!invoices || invoices.length === 0) {
                 setData({ pupuk: [], pestisida: [] });
                 setLoading(false);
                 return;
            }

            const invoiceMap = {};
            invoices.forEach(inv => {
                const monthIndex = new Date(inv.invoice_date).getMonth(); // 0 to 11
                if (!isNaN(monthIndex)) {
                    invoiceMap[inv.id] = monthIndex;
                }
            });

            const invoiceIds = invoices.map(i => i.id);

            // Fetch items
            const { data: items, error: itemsError } = await supabase
                .from('invoice_items')
                .select('invoice_id, product_name, subtotal')
                .in('invoice_id', invoiceIds);

            if (itemsError) throw itemsError;

            // Grouping logic - Initialize with ALL master products
            const matrixMap = {};
            const allProducts = getAllProducts();
            allProducts.forEach(p => {
                if (p.name) {
                    matrixMap[p.name] = Array(12).fill(0);
                }
            });

            items.forEach(item => {
                const month = invoiceMap[item.invoice_id];
                if (month === undefined) return;
                
                const prodName = (item.product_name || "").trim();
                if (!prodName) return;

                // Match dynamically against master products to roll up properly
                const matched = matchProduct(prodName, 0.4);
                const bucketName = matched?.match?.name || prodName;

                if (!matrixMap[bucketName]) {
                    matrixMap[bucketName] = Array(12).fill(0);
                }
                // Add subtotal
                matrixMap[bucketName][month] += Number(item.subtotal || 0);
            });

            // Split into categories and format
            const pupukArr = [];
            const pestiArr = [];

            for (const [name, bulanan] of Object.entries(matrixMap)) {
                const totalTahun = bulanan.reduce((sum, val) => sum + val, 0);
                const rowObj = { name, bulanan, totalTahun };
                if (isPupuk(name)) {
                    pupukArr.push(rowObj);
                } else {
                    pestiArr.push(rowObj);
                }
            }

            // Sort alphabetical
            pupukArr.sort((a,b) => a.name.localeCompare(b.name));
            pestiArr.sort((a,b) => a.name.localeCompare(b.name));

            setData({
                pupuk: pupukArr,
                pestisida: pestiArr
            });

        } catch (error) {
            console.error("Gagal ambil data:", error);
            setErrorMsg(error.message);
        } finally {
            setLoading(false);
        }
    };

    // Calculators
    const totalByMonth = (section) => {
       const sumArray = Array(12).fill(0);
       section.forEach(item => {
           item.bulanan.forEach((val, i) => sumArray[i] += val);
       });
       return sumArray;
    };
    
    const pupukMonths = totalByMonth(data.pupuk);
    const pestiMonths = totalByMonth(data.pestisida);
    const pupukTotal = pupukMonths.reduce((a,b)=>a+b, 0);
    const pestiTotal = pestiMonths.reduce((a,b)=>a+b, 0);

    const hasData = pupukTotal > 0 || pestiTotal > 0;

    const formatRp = (num) => num === 0 ? '-' : new Intl.NumberFormat('id-ID', { minimumFractionDigits: 0 }).format(num);

    return (
        <div className="p-6 bg-white min-h-screen">
            {/* Header Profesional Ala PT. KALATHAM */}
            <div className="border-b-4 border-[#2c3e50] pb-4 mb-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-black text-[#2c3e50] tracking-tighter">AdminPRO - PT. KALATHAM</h1>
                        <p className="text-sm text-gray-500 font-bold uppercase">Rekapitulasi Penjualan Per Produk 2026</p>
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="p-10 text-center text-gray-500">Menyusun laporan...</div>
            ) : errorMsg ? (
                <div className="p-10 text-center text-red-500">Error: {errorMsg}</div>
            ) : (
                <div className="overflow-x-auto shadow-xl rounded-lg border border-gray-200">
                    <table className="min-w-full text-sm">
                        <thead>
                            <tr className="bg-[#2c3e50] text-white font-bold">
                                <th className="px-4 py-3 text-left sticky left-0 bg-[#2c3e50] z-10 border-r border-[#34495e]">PRODUK</th>
                                {namaBulan.map(b => (
                                    <th key={b} className="px-2 py-3 text-center border-r border-[#34495e]">{b}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {hasData ? (
                                <>
                                    {/* SECTION PUPUK */}
                                    {data.pupuk.length > 0 && (
                                        <tr>
                                            <td colSpan="13" className="px-4 py-2 font-black text-white bg-green-700">PUPUK</td>
                                        </tr>
                                    )}
                                    {data.pupuk.map((item, idx) => (
                                         <tr key={`pupuk-${idx}`} className={`hover:bg-gray-50 bg-white`}>
                                            <td className="px-4 py-2 text-gray-800 font-bold sticky left-0 bg-inherit border-r shadow-[2px_0_5px_rgba(0,0,0,0.02)] whitespace-nowrap">
                                                {item.name}
                                            </td>
                                            {item.bulanan.map((val, i) => (
                                                <td key={i} className="px-2 py-2 text-right border-r border-gray-100 text-gray-700">
                                                    {formatRp(val)}
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                    
                                    {/* SECTION PESTISIDA */}
                                    {data.pestisida.length > 0 && (
                                        <tr>
                                            <td colSpan="13" className="px-4 py-2 font-black text-white bg-red-700">PESTISIDA</td>
                                        </tr>
                                    )}
                                    {data.pestisida.map((item, idx) => (
                                         <tr key={`pesti-${idx}`} className={`hover:bg-gray-50 bg-white`}>
                                            <td className="px-4 py-2 text-gray-800 font-bold sticky left-0 bg-inherit border-r shadow-[2px_0_5px_rgba(0,0,0,0.02)] whitespace-nowrap">
                                                {item.name}
                                            </td>
                                            {item.bulanan.map((val, i) => (
                                                <td key={i} className="px-2 py-2 text-right border-r border-gray-100 text-gray-700">
                                                    {formatRp(val)}
                                                </td>
                                            ))}
                                        </tr>
                                    ))}

                                    {/* SUMMARY ROWS */}
                                    <tr className="bg-gray-100 font-bold border-t-4 border-gray-300">
                                        <td className="px-4 py-3 sticky left-0 bg-inherit border-r shadow-[2px_0_5px_rgba(0,0,0,0.02)] whitespace-nowrap text-gray-800">
                                            Jumlah Uang Produk Pupuk
                                        </td>
                                        {pupukMonths.map((val, i) => (
                                            <td key={i} className="px-2 py-3 text-right border-r border-gray-200 text-gray-800">
                                                {formatRp(val)}
                                            </td>
                                        ))}
                                    </tr>
                                    <tr className="bg-gray-100 font-bold">
                                        <td className="px-4 py-3 sticky left-0 bg-inherit border-r shadow-[2px_0_5px_rgba(0,0,0,0.02)] whitespace-nowrap text-gray-800">
                                            Jumlah Uang Produk Pestisida
                                        </td>
                                        {pestiMonths.map((val, i) => (
                                            <td key={i} className="px-2 py-3 text-right border-r border-gray-200 text-gray-800">
                                                {formatRp(val)}
                                            </td>
                                        ))}
                                    </tr>
                                    <tr className="bg-blue-50 font-black text-blue-900 border-t-4 border-blue-300">
                                        <td className="px-4 py-4 sticky left-0 bg-inherit border-r shadow-[2px_0_5px_rgba(0,0,0,0.02)] whitespace-nowrap">
                                            TOTAL OMZET PUPUK & PESTISIDA
                                        </td>
                                        {Array(12).fill(0).map((_, i) => (
                                            <td key={i} className="px-2 py-4 text-right border-r border-blue-200">
                                                {formatRp(pupukMonths[i] + pestiMonths[i])}
                                            </td>
                                        ))}
                                    </tr>
                                </>
                            ) : (
                                <tr>
                                    <td colSpan="13" className="px-4 py-8 text-center text-gray-500 font-bold">
                                        Tidak ada data untuk tahun {tahunAktif}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}