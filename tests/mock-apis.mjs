// Mock Shiprocket (/sr/*) and Razorpay (/rzp/*) APIs for end-to-end testing.
import http from 'node:http';

const log = [];
let adhocCalls = 0;
let loginCalls = 0;
const srOrders = new Map();
const rzpOrders = new Map();
const emails = [];
const dlShipments = [];
let refundSeq = 0;
const refunded = new Map(); // payment id -> paise refunded
const serviceabilityQueries = [];
let refundCalls = 0;

function send(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
}

http.createServer(async (req, res) => {
  let raw = '';
  for await (const c of req) raw += c;
  let body = null;
  try { body = raw ? JSON.parse(raw) : null; } catch { body = null; }
  const url = new URL(req.url, 'http://x');
  const p = url.pathname;
  log.push({ method: req.method, path: p, body, auth: req.headers.authorization });

  if (p === '/_log') return send(res, 200, { log, loginCalls, adhocCalls, srOrders: [...srOrders.values()], emails, dlShipments, serviceabilityQueries, refundCalls });

  // ---------------- Resend (e-mail)
  if (p === '/em/emails') {
    if (req.headers.authorization !== 'Bearer re_test_key_123') return send(res, 401, { message: 'API key is invalid' });
    emails.push({ to: body.to[0], subject: body.subject, from: body.from });
    return send(res, 200, { id: `em_${emails.length}` });
  }

  // ---------------- Delhivery
  if (p.startsWith('/dl/')) {
    if (req.headers.authorization !== 'Token dl-token-123456') return send(res, 401, { detail: 'Invalid token' });
    if (p === '/dl/c/api/pin-codes/json/') {
      const pin = url.searchParams.get('filter_codes');
      if (pin === '799999') return send(res, 200, { delivery_codes: [] });
      return send(res, 200, { delivery_codes: [{ postal_code: { pin: Number(pin), cod: 'Y', pre_paid: 'Y', pickup: 'Y', city: 'Lucknow', state_code: 'UP' } }] });
    }
    if (p === '/dl/api/kinko/v1/invoice/charges/.json') return send(res, 200, [{ total_amount: 88.5 }]);
    if (p === '/dl/api/cmu/create.json') {
      const data = JSON.parse(new URLSearchParams(raw).get('data'));
      if (data.pickup_location?.name !== 'RAJ-HOME') return send(res, 200, { success: false, packages: [{ status: 'Fail', remarks: ['ClientWarehouse matching query does not exist.'] }] });
      const wb = `DL${9000000000 + dlShipments.length + 1}`;
      dlShipments.push({ waybill: wb, shipment: data.shipments[0] });
      return send(res, 200, { success: true, packages: [{ status: 'Success', waybill: wb, refnum: data.shipments[0].order }] });
    }
    if (p === '/dl/fm/request/new/') return send(res, 200, { pickup_id: 555, pickup_date: body.pickup_date });
    if (p === '/dl/api/p/packing_slip') return send(res, 200, { packages: [{ pdf_download_link: 'https://example.com/dl-label.pdf' }] });
    if (p === '/dl/api/v1/packages/json/') return send(res, 200, { ShipmentData: [{ Shipment: { Status: { Status: 'Delivered', StatusType: 'DL', StatusDateTime: '2026-11-25T10:00:00' },
      Scans: [{ ScanDetail: { Scan: 'Manifested', ScanDateTime: '2026-11-23T12:00:00', ScannedLocation: 'Varanasi' } }, { ScanDetail: { Scan: 'Delivered', ScanDateTime: '2026-11-25T10:00:00', ScannedLocation: 'Lucknow' } }] } }] });
    if (p === '/dl/api/p/edit') return send(res, 200, { status: true, remark: 'Cancelled', waybill: body.waybill });
    return send(res, 404, { detail: 'mock: unknown dl path ' + p });
  }

  // ---------------- Shiprocket
  if (p.startsWith('/sr/')) {
    if (p === '/sr/auth/login') {
      loginCalls++;
      if (body.password !== 'sr-pass') return send(res, 400, { message: 'Invalid email and password combination' });
      return send(res, 200, { token: `tok-${loginCalls}` });
    }
    if (!req.headers.authorization?.startsWith('Bearer tok-')) return send(res, 401, { message: 'Unauthenticated.' });
    if (p === '/sr/settings/company/pickup') {
      return send(res, 200, { data: { shipping_address: [{ pickup_location: 'Varanasi-Home', address: 'Shop 1, Temple Rd', city: 'Varanasi', state: 'Uttar Pradesh', pin_code: '221001', phone: '9876500000' }] } });
    }
    if (p === '/sr/courier/serviceability/') {
      const del = url.searchParams.get('delivery_postcode');
      serviceabilityQueries.push(Object.fromEntries(url.searchParams));
      // 788001: served for prepaid only (no courier offers COD) — only visible when asked with cod=0
      if (del === '788001') {
        if (url.searchParams.get('cod') === '1') return send(res, 200, { status: 200, data: { available_courier_companies: [] } });
        return send(res, 200, { status: 200, data: { available_courier_companies: [{ courier_company_id: 31, courier_name: 'Blue Dart', rate: 140, estimated_delivery_days: '6', cod: 0, etd: 'Dec 01' }] } });
      }
      if (del === '799999') return send(res, 200, { status: 200, data: { available_courier_companies: [] } });
      return send(res, 200, { status: 200, data: { recommended_courier_company_id: 10, available_courier_companies: [
        { courier_company_id: 10, courier_name: 'Delhivery Surface', rate: 85.5, estimated_delivery_days: '4', cod: 1, etd: 'Nov 27' },
        { courier_company_id: 22, courier_name: 'Xpressbees', rate: 72, estimated_delivery_days: '5', cod: 1, etd: 'Nov 28' }
      ] } });
    }
    if (p === '/sr/orders/create/adhoc') {
      adhocCalls++;
      if (adhocCalls === 1) return send(res, 401, { message: 'Token has expired' }); // test re-login
      if (body.pickup_location !== 'Varanasi-Home') return send(res, 422, { message: 'Wrong Pickup location entered', errors: { pickup_location: ['Invalid pickup location'] } });
      const id = 5550000 + srOrders.size + 1;
      const total = body.sub_total + body.shipping_charges + body.transaction_charges - body.total_discount;
      srOrders.set(id, { id, body, total });
      return send(res, 200, { order_id: id, shipment_id: id + 2000000, status: 'NEW', status_code: 1 });
    }
    const show = p.match(/^\/sr\/orders\/show\/(\d+)$/);
    if (show) return send(res, 200, { data: { id: Number(show[1]), total: srOrders.get(Number(show[1]))?.total } });
    if (p === '/sr/courier/assign/awb') {
      return send(res, 200, { awb_assign_status: 1, response: { data: { awb_code: `AWB${body.shipment_id}`, courier_name: body.courier_id === 22 ? 'Xpressbees' : 'Delhivery Surface', courier_company_id: body.courier_id || 10, freight_charges: 92 } } });
    }
    if (p === '/sr/courier/generate/pickup') return send(res, 200, { pickup_status: 1, response: { pickup_scheduled_date: '2026-11-23 10:00:00' } });
    if (p === '/sr/courier/generate/label') return send(res, 200, { label_created: 1, label_url: 'https://example.com/label.pdf' });
    if (p === '/sr/orders/print/invoice') return send(res, 200, { is_invoice_created: true, invoice_url: 'https://example.com/invoice.pdf' });
    const tr = p.match(/^\/sr\/courier\/track\/awb\/(.+)$/);
    if (tr) return send(res, 200, { tracking_data: { track_status: 1, shipment_track: [{ current_status: 'In Transit', edd: '2026-11-27' }], etd: '2026-11-27 18:00:00', track_url: `https://shiprocket.co/tracking/${tr[1]}`,
      shipment_track_activities: [
        { date: '2026-11-24 09:10:00', activity: 'In Transit - Reached Lucknow hub', location: 'Lucknow' },
        { date: '2026-11-23 18:00:00', activity: 'Picked up', location: 'Varanasi' }
      ] } });
    if (p === '/sr/orders/cancel') return send(res, 200, { message: 'Order cancelled' });
    return send(res, 404, { message: 'mock: unknown sr path ' + p });
  }

  // ---------------- Razorpay
  if (p.startsWith('/rzp/')) {
    const basic = Buffer.from((req.headers.authorization || '').replace('Basic ', ''), 'base64').toString();
    if (basic !== 'rzp_test_KEY:rzp-secret') return send(res, 401, { error: { code: 'BAD_REQUEST_ERROR', description: 'Authentication failed' } });
  }
  if (p === '/rzp/v1/orders' && req.method === 'GET') return send(res, 200, { entity: 'collection', count: 0, items: [] });
  if (p === '/rzp/v1/orders') {
    const id = `order_TEST${rzpOrders.size + 1}`;
    rzpOrders.set(id, body.amount);
    return send(res, 200, { id, amount: body.amount, currency: 'INR', status: 'created' });
  }
  const refund = p.match(/^\/rzp\/v1\/payments\/(.+)\/refund$/);
  if (refund) {
    refundCalls++;
    const pid = refund[1];
    const orderId = pid.replace('pay_', 'order_');
    const captured = rzpOrders.get(orderId) ?? Number.MAX_SAFE_INTEGER;
    const already = refunded.get(pid) || 0;
    if (already + body.amount > captured) return send(res, 400, { error: { code: 'BAD_REQUEST_ERROR', description: 'The refund amount provided is greater than amount captured' } });
    refunded.set(pid, already + body.amount);
    return send(res, 200, { id: `rfnd_TEST${++refundSeq}`, amount: body.amount, status: 'processed' });
  }
  const pay = p.match(/^\/rzp\/v1\/payments\/(.+)$/);
  if (pay) {
    const [, pid] = pay;
    const orderId = pid.replace('pay_', 'order_');
    return send(res, 200, { id: pid, order_id: orderId, amount: rzpOrders.get(orderId) ?? 0, amount_refunded: refunded.get(pid) || 0, status: 'captured' });
  }
  send(res, 404, { message: 'mock: not found' });
}).listen(4010, '127.0.0.1', () => console.log('mock apis on 4010'));
