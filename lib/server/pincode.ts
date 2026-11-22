import { getSettingsSection } from './settings';
import { getServiceability, shiprocketConfigured } from './shiprocket';
import { delhiveryConfigured, delhiveryPincode } from './delhivery';
import type { PincodeResult } from '../shared/types';

const cache = new Map<string, { at: number; result: PincodeResult }>();
const CACHE_MS = 6 * 60 * 60 * 1000;

const ZONES: Record<string, { region: string; days: number }> = {
  '1': { region: 'North India (Delhi NCR, HR, PB, HP, J&K)', days: 4 },
  '2': { region: 'North India (UP, Uttarakhand)', days: 4 },
  '3': { region: 'West India (Rajasthan, Gujarat)', days: 4 },
  '4': { region: 'West & Central India (MH, MP, CG, Goa)', days: 4 },
  '5': { region: 'South India (AP, Telangana, Karnataka)', days: 5 },
  '6': { region: 'South India (Tamil Nadu, Kerala)', days: 5 },
  '7': { region: 'East & North-East India (WB, Odisha, NE)', days: 6 },
  '8': { region: 'East India (Bihar, Jharkhand)', days: 5 }
};

function deliveryDate(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'Asia/Kolkata' });
}

export async function checkPincode(pincode: string): Promise<PincodeResult> {
  const pin = pincode.replace(/\D/g, '');
  const payments = await getSettingsSection('payments');
  if (!/^[1-8][0-9]{5}$/.test(pin)) {
    return {
      pincode: pin, isServiceable: false, live: false, region: '', estimatedDeliveryDays: 0, estimatedDeliveryDate: '', codAvailable: false,
      message: 'Please enter a valid 6-digit Indian pincode.'
    };
  }
  const hit = cache.get(pin);
  if (hit && Date.now() - hit.at < CACHE_MS) return { ...hit.result, codAvailable: hit.result.codAvailable && payments.enableCod };

  const zone = ZONES[pin[0]];
  const business = await getSettingsSection('business');

  if ((await shiprocketConfigured()) && /^[1-9][0-9]{5}$/.test(business.pincode)) {
    try {
      const { couriers } = await getServiceability({ pickup: business.pincode, delivery: pin, weightKg: 0.5, cod: true });
      if (couriers.length === 0) {
        const result: PincodeResult = {
          pincode: pin, isServiceable: false, live: true, region: zone.region, estimatedDeliveryDays: 0, estimatedDeliveryDate: '', codAvailable: false,
          message: 'Sorry, our courier partners do not deliver to this pincode yet. Message us on WhatsApp for help.'
        };
        cache.set(pin, { at: Date.now(), result });
        return result;
      }
      const days = Math.min(...couriers.map((c) => Number(c.estimated_delivery_days) || zone.days)) + 1; // +1 dispatch day
      const codAvailable = couriers.some((c) => c.cod === 1);
      const result: PincodeResult = {
        pincode: pin, isServiceable: true, live: true, region: zone.region, estimatedDeliveryDays: days,
        estimatedDeliveryDate: deliveryDate(days), codAvailable,
        message: `Delivery available in about ${days}–${days + 1} days.`
      };
      cache.set(pin, { at: Date.now(), result });
      return { ...result, codAvailable: codAvailable && payments.enableCod };
    } catch (err) {
      console.warn('[pincode] Shiprocket serviceability failed, using estimate:', (err as Error).message);
    }
  }

  if (await delhiveryConfigured()) {
    try {
      const d = await delhiveryPincode(pin);
      const result: PincodeResult = d.serviceable
        ? { pincode: pin, isServiceable: true, live: true, region: d.city ? `${d.city}${d.state ? `, ${d.state}` : ''}` : zone.region, estimatedDeliveryDays: zone.days,
            estimatedDeliveryDate: deliveryDate(zone.days), codAvailable: d.cod, message: `Delivery available. Estimated ${zone.days}–${zone.days + 2} days.` }
        : { pincode: pin, isServiceable: false, live: true, region: zone.region, estimatedDeliveryDays: 0, estimatedDeliveryDate: '', codAvailable: false,
            message: 'Sorry, our courier partner does not deliver to this pincode yet. Message us on WhatsApp for help.' };
      cache.set(pin, { at: Date.now(), result });
      return { ...result, codAvailable: result.codAvailable && payments.enableCod };
    } catch (err) {
      console.warn('[pincode] Delhivery check failed, using estimate:', (err as Error).message);
    }
  }

  return {
    pincode: pin, isServiceable: true, live: false, region: zone.region, estimatedDeliveryDays: zone.days,
    estimatedDeliveryDate: deliveryDate(zone.days), codAvailable: payments.enableCod,
    message: `We deliver across India. Estimated delivery in ${zone.days}–${zone.days + 2} days.`
  };
}
