import { supabase } from './supabase';

// =====================================================
// INVOICES
// =====================================================
export async function saveInvoice(data) {
    const { data: invoice, error } = await supabase
        .from('invoices')
        .insert([{
            customer_name: data.customerName,
            invoice_number: data.invoiceNumber,
            invoice_date: data.invoiceDate,
            products: data.products,
            total_amount: data.totalAmount,
            image_url: data.imageUrl || '',
            status: 'confirmed',
            created_at: new Date().toISOString()
        }])
        .select()
        .single();
    if (error) throw error;
    return invoice.id;
}

export function subscribeInvoices(callback) {
    // Initial load
    loadInvoices().then(callback);

    // Real-time subscription
    const channel = supabase
        .channel('invoices-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'invoices' }, () => {
            loadInvoices().then(callback);
        })
        .subscribe();

    return () => supabase.removeChannel(channel);
}

async function loadInvoices() {
    const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .order('created_at', { ascending: false });
    if (error) { console.error(error); return []; }
    return data.map(mapInvoice);
}

function mapInvoice(row) {
    return {
        id: row.id,
        customerName: row.customer_name,
        invoiceNumber: row.invoice_number,
        invoiceDate: row.invoice_date,
        products: row.products || [],
        totalAmount: row.total_amount,
        imageUrl: row.image_url,
        status: row.status,
        createdAt: row.created_at
    };
}

// =====================================================
// CUSTOMERS
// =====================================================
export async function upsertCustomer(name, invoiceTotal) {
    // Check if exists
    const { data: existing } = await supabase
        .from('customers')
        .select('*')
        .eq('name', name)
        .single();

    if (existing) {
        const { error } = await supabase
            .from('customers')
            .update({
                total_transaksi: (existing.total_transaksi || 0) + invoiceTotal,
                jumlah_invoice: (existing.jumlah_invoice || 0) + 1,
                updated_at: new Date().toISOString()
            })
            .eq('name', name);
        if (error) throw error;
    } else {
        const { error } = await supabase
            .from('customers')
            .insert([{
                name,
                total_transaksi: invoiceTotal,
                jumlah_invoice: 1,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            }]);
        if (error) throw error;
    }
}

export function subscribeCustomers(callback) {
    loadCustomers().then(callback);
    const channel = supabase
        .channel('customers-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'customers' }, () => {
            loadCustomers().then(callback);
        })
        .subscribe();
    return () => supabase.removeChannel(channel);
}

async function loadCustomers() {
    const { data, error } = await supabase
        .from('customers')
        .select('*')
        .order('name');
    if (error) { console.error(error); return []; }
    return data.map(r => ({
        id: r.id, name: r.name,
        totalTransaksi: r.total_transaksi,
        jumlahInvoice: r.jumlah_invoice
    }));
}

// =====================================================
// PRODUCTS
// =====================================================
export async function upsertProduct(productName, qty, unitPrice) {
    const revenue = qty * unitPrice;
    const { data: existing } = await supabase
        .from('products')
        .select('*')
        .eq('name', productName)
        .single();

    if (existing) {
        const { error } = await supabase
            .from('products')
            .update({
                total_sold: (existing.total_sold || 0) + qty,
                total_revenue: (existing.total_revenue || 0) + revenue,
                updated_at: new Date().toISOString()
            })
            .eq('name', productName);
        if (error) throw error;
    } else {
        const { error } = await supabase
            .from('products')
            .insert([{
                name: productName,
                total_sold: qty,
                total_revenue: revenue,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            }]);
        if (error) throw error;
    }
}

export function subscribeProducts(callback) {
    loadProducts().then(callback);
    const channel = supabase
        .channel('products-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => {
            loadProducts().then(callback);
        })
        .subscribe();
    return () => supabase.removeChannel(channel);
}

async function loadProducts() {
    const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('total_sold', { ascending: false });
    if (error) { console.error(error); return []; }
    return data.map(r => ({
        id: r.id, name: r.name,
        totalSold: r.total_sold,
        totalRevenue: r.total_revenue
    }));
}

// =====================================================
// TARGETS
// =====================================================
export async function setTarget(customerName, targetAmount) {
    const { data: existing } = await supabase
        .from('targets')
        .select('*')
        .eq('customer_name', customerName)
        .single();

    if (existing) {
        const { error } = await supabase
            .from('targets')
            .update({ target_amount: targetAmount, updated_at: new Date().toISOString() })
            .eq('customer_name', customerName);
        if (error) throw error;
    } else {
        const { error } = await supabase
            .from('targets')
            .insert([{
                customer_name: customerName,
                target_amount: targetAmount,
                current_amount: 0,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            }]);
        if (error) throw error;
    }
}

export async function updateTargetProgress(customerName, addAmount) {
    const { data: existing } = await supabase
        .from('targets')
        .select('*')
        .eq('customer_name', customerName)
        .single();

    if (existing) {
        const { error } = await supabase
            .from('targets')
            .update({
                current_amount: (existing.current_amount || 0) + addAmount,
                updated_at: new Date().toISOString()
            })
            .eq('customer_name', customerName);
        if (error) throw error;
    }
}

export function subscribeTargets(callback) {
    loadTargets().then(callback);
    const channel = supabase
        .channel('targets-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'targets' }, () => {
            loadTargets().then(callback);
        })
        .subscribe();
    return () => supabase.removeChannel(channel);
}

async function loadTargets() {
    const { data, error } = await supabase
        .from('targets')
        .select('*');
    if (error) { console.error(error); return []; }
    return data.map(r => ({
        id: r.id,
        customerName: r.customer_name,
        targetAmount: r.target_amount,
        currentAmount: r.current_amount
    }));
}

// =====================================================
// STATS (Dashboard)
// =====================================================
export function subscribeStats(callback) {
    const load = async () => {
        const [invRes, custRes, prodRes, targRes] = await Promise.all([
            supabase.from('invoices').select('total_amount'),
            supabase.from('customers').select('id'),
            supabase.from('products').select('total_sold'),
            supabase.from('targets').select('target_amount, current_amount'),
        ]);

        const invoices = invRes.data || [];
        const products = prodRes.data || [];
        const targets = targRes.data || [];
        const completed = targets.filter(t => t.current_amount >= t.target_amount).length;

        callback(() => ({
            totalInvoices: invoices.length,
            totalRevenue: invoices.reduce((s, i) => s + (i.total_amount || 0), 0),
            totalCustomers: (custRes.data || []).length,
            totalProducts: products.length,
            totalProductsSold: products.reduce((s, p) => s + (p.total_sold || 0), 0),
            totalTargets: targets.length,
            targetsCompleted: completed
        }));
    };

    load();

    // Listen to all tables
    const channels = ['invoices', 'customers', 'products', 'targets'].map(table =>
        supabase
            .channel(`stats-${table}`)
            .on('postgres_changes', { event: '*', schema: 'public', table }, () => load())
            .subscribe()
    );

    return () => channels.forEach(ch => supabase.removeChannel(ch));
}
