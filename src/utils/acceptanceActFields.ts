import { AcceptanceAct, Client, Order } from '../types';
import { calcEstimatedCompletionDate } from './orderDates';
import { getOrderStatedProblem } from './orderProblemText';

const uniqueLines = (values: Array<string | undefined | null>): string[] => {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const value of values) {
    const trimmed = String(value ?? '').trim();
    if (!trimmed || seen.has(trimmed)) {
      continue;
    }
    seen.add(trimmed);
    result.push(trimmed);
  }

  return result;
};

export const buildAcceptanceActNotes = (parts: {
  receptionistNotes?: string;
  staffComments?: string;
  clientComment?: string;
  clientNotes?: string;
  existingClientNotes?: string;
}): string =>
  uniqueLines([
    parts.receptionistNotes,
    parts.staffComments,
    parts.clientComment,
    parts.clientNotes,
    parts.existingClientNotes,
  ]).join('\n');

export const getOrderInternalNotes = (order?: Order | null): string =>
  uniqueLines(
    (order?.communicationHistory || [])
      .filter((entry) => entry.channel === 'internal')
      .map((entry) => entry.message)
  ).join('\n');

export const getAcceptanceActNotes = (
  act: AcceptanceAct,
  order?: Order | null,
  client?: Client | null
): string => {
  const stored = act.client.notes?.trim();
  if (stored) {
    return stored;
  }

  return buildAcceptanceActNotes({
    staffComments: getOrderInternalNotes(order),
    existingClientNotes: client?.notes,
  });
};

/** Комплектация хранится в snapshot клиента акта (поле address). */
export const getAcceptanceActCompleteness = (act: AcceptanceAct): string => act.client.address?.trim() || '';

/** Подставляет в акт актуальные IMEI, S/N и пароль из заказа, если в snapshot они пустые. */
export const enrichActDeviceFromOrder = <T extends { device: { password?: string; imei?: string; serialNumber?: string } }>(
  document: T,
  order?: Order | null
): T => {
  if (!order) {
    return document;
  }

  const password = document.device.password?.trim() || order.devicePassword?.trim() || '';
  const imei = document.device.imei?.trim() || order.deviceImei?.trim() || '';
  const serialNumber = document.device.serialNumber?.trim() || order.deviceSerial?.trim() || '';

  if (
    password === (document.device.password || '') &&
    imei === (document.device.imei || '') &&
    serialNumber === (document.device.serialNumber || '')
  ) {
    return document;
  }

  return {
    ...document,
    device: {
      ...document.device,
      password,
      imei,
      serialNumber,
    },
  };
};

export const enrichAcceptanceActForDisplay = (
  act: AcceptanceAct,
  order?: Order | null,
  client?: Client | null
): AcceptanceAct => {
  const notes = getAcceptanceActNotes(act, order, client);
  const completeness = getAcceptanceActCompleteness(act);
  const estimatedDays = order?.estimatedDays || act.estimatedDays;
  const estimatedCompletionDate =
    act.estimatedCompletionDate ||
    (estimatedDays && order?.createdAt
      ? calcEstimatedCompletionDate(order.createdAt, estimatedDays).toISOString()
      : act.estimatedCompletionDate);
  const problemDescription = getOrderStatedProblem(order) || act.problemDescription;
  const preliminaryCost =
    order?.estimatedCost != null && Number(order.estimatedCost) > 0
      ? Number(order.estimatedCost)
      : act.preliminaryCost;

  const clientNameParts = (order?.clientName || '').trim().split(/\s+/).filter(Boolean);
  const clientFromOrder = order
    ? {
        firstName: clientNameParts[0] || act.client.firstName,
        lastName: clientNameParts.slice(1).join(' ') || act.client.lastName,
        phone: order.clientPhone || act.client.phone,
      }
    : {};

  return enrichActDeviceFromOrder(
    {
      ...act,
      problemDescription,
      preliminaryCost,
      estimatedDays,
      estimatedCompletionDate,
      client: {
        ...act.client,
        ...clientFromOrder,
        notes: notes || act.client.notes || '',
        address: completeness || act.client.address || '',
      },
    },
    order
  );
};

export const prepareAcceptanceActClient = (
  client: Client,
  formData?: {
    receptionistNotes?: string;
    staffComments?: string;
    clientComment?: string;
    clientNotes?: string;
    completeness?: string;
  }
): Client => ({
  ...client,
  notes: buildAcceptanceActNotes({
    receptionistNotes: formData?.receptionistNotes,
    staffComments: formData?.staffComments,
    clientComment: formData?.clientComment,
    clientNotes: formData?.clientNotes,
    existingClientNotes: client.notes,
  }),
  address: formData?.completeness?.trim() || client.address || '',
});
