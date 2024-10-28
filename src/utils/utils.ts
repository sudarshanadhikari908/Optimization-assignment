import { Types } from "mongoose";
import { ProfileType, VendorTypes } from "../constants/constants";
import { ChargeTemplateModel } from "../models/chargeTemplate";
import _ from "lodash";

export const queryForVendorValidityCheck = (payloadData: any): any => {
  const { owner, groupIds, vendorList, vendorType } = payloadData;
  let criteria: any = {
    owner,
    isDeleted: { $ne: true },
    chargeTemplateGroupID: {
      $in: [new Types.ObjectId("66729ed844d8b882ea14817c")],
    },
  };
  if (vendorType === VendorTypes.DRIVER) {
    criteria = {
      ...criteria,
      $or: [
        {
          vendorProfileType: {
            $in: [vendorType, ProfileType.DRIVER_GROUP],
          },
          vendorId: {
            $in: [...(vendorList ?? []), ...(groupIds ?? [])]?.filter(Boolean),
          },
        },
        {
          vendorProfileType: ProfileType.ALL_DRIVER_GROUP,
        },
      ],
    };
  }

  if (vendorType === VendorTypes.CARRIER) {
    criteria = {
      ...criteria,
      vendorProfileType: {
        $in: [vendorType, ProfileType.CARRIER_GROUP],
      },
      vendorId: {
        $in: [...(vendorList ?? []), ...(groupIds ?? [])]?.filter(Boolean),
      },
    };
  }

  return criteria;
};

export const getRuleBasedCharges = async (
  routing?: any,
  additionalInfo?: any
): Promise<any[]> => {
  let groupIds: string[] = [];

  additionalInfo?.vendorList?.forEach((singleVendor: string) => {
    const groupForVendor =
      additionalInfo?.groupInformation?.vendor?.[singleVendor];
    groupIds = [...groupIds, ...(groupForVendor ?? [])];
  });

  const payloadForQueryMaker = {
    owner: additionalInfo?.owner,
    groupIds,
    vendorList: additionalInfo?.vendorList,
    vendorType: additionalInfo?.vendorType,
  };
  const validityCheckQuery = queryForVendorValidityCheck(payloadForQueryMaker);
  let finalQuery = { ...validityCheckQuery };

  const countQuery = { ...finalQuery, "multiQueryIndex.0": { $exists: true } };
  const chargeTemplateCount: any = await ChargeTemplateModel.findOne(
    countQuery
  ).lean();
  if (!chargeTemplateCount) return [];
  const queryForRouting = findCombination(
    routing,
    additionalInfo?.groupInformation
  );
  const orCriteria = finalQuery?.$or;
  delete finalQuery?.$or;

  finalQuery = {
    ...finalQuery,
    moveType: { $ne: "BY_LEG" },
    $and: [
      {
        $or: queryForRouting?.map((singleRoutingQuery: any) => ({
          multiQueryIndex: singleRoutingQuery,
        })),
      },
    ],
  };

  if (orCriteria) {
    finalQuery.$and.push({ $or: orCriteria });
  }

  return await ChargeTemplateModel.find(finalQuery).lean();
};

const findCombination = (driverOrders = [], groupInformation: any) => {
  const minWindowSize = 2;
  const maxWindowSize = Math.min(5, driverOrders.length); // Limit the max frame size to reduce memory usage
  let totalCombinations = [];

  for (let frame = minWindowSize; frame <= maxWindowSize; frame++) {
    const slicedOrder = driverOrders.slice(0, frame);
    const combination = getCombination(slicedOrder, groupInformation);
    totalCombinations.push(combination);
  }
  
  const flatTotalCombination = _.uniqWith(totalCombinations.flat(), _.isEqual);

  return flatTotalCombination?.map((singleCombination: any) =>
    singleCombination?.filter(Boolean)
  );
};

const getCombination = (slicedOrder: any = [], groupInformation: any) => {
  const combinations: any[] = [];
  const memo: Record<string, string[]> = {};
  const groupCache: any = {};

  const buildGroupCache = (group: any) => {
    const result: Record<string, Set<string>> = {};
    for (const [key, valueArray] of Object.entries(group)) {
      result[key] = new Set(valueArray as any[]);
    }
    return result;
  };

  for (const [groupKey, groupValue] of Object.entries(groupInformation)) {
    groupCache[groupKey] = buildGroupCache(groupValue);
  }

  const generateCombinations = () => {
    const stack: { index: number; currentCombination: string[] }[] = [
      { index: 0, currentCombination: [] },
    ];

    while (stack.length > 0) {
      const { index, currentCombination } = stack.pop()!;
      if (index === slicedOrder.length) {
        combinations.push([...currentCombination]);
        continue;
      }

      const order = slicedOrder[index];
      const customerId = order.customerId?._id ?? order.customerId ?? "";
      const cacheKey = `${order.type}-${customerId}`;

      if (!memo[cacheKey]) {
        memo[cacheKey] = [
          `${order.type}-${customerId}`,
          ...(order.city && order.state
            ? [`${order.type}-${order.city},${order.state}`]
            : []),
          ...(order.zip_code ? [`${order.type}-${order.zip_code}`] : []),
          `${order.type}-${ProfileType.ALL_CUSTOMER}`,
          ...Array.from(groupCache.profile[customerId] || []).map(
            (profile) => `${order.type}-${profile}`
          ),
          ...Array.from(groupCache.cityState[customerId] || []).map(
            (profile) => `${order.type}-${profile}`
          ),
          ...Array.from(groupCache.zipCode[customerId] || []).map(
            (profile) => `${order.type}-${profile}`
          ),
        ];
      }

      for (const profile of memo[cacheKey]) {
        stack.push({
          index: index + 1,
          currentCombination: [...currentCombination, profile],
        });
      }
    }
  };

  generateCombinations();

  return combinations;
};

export const getRuleBasedChargesForLocation = async (
  routing?: any,
  additionalInfo?: any
): Promise<any[]> => {
  let groupIds: string[] = [];

  additionalInfo?.vendorList?.forEach((singleVendor: string) => {
    const groupForVendor =
      additionalInfo?.groupInformation?.vendor?.[singleVendor];
    groupIds = [...groupIds, ...(groupForVendor ?? [])];
  });

  const payloadForQueryMaker = {
    owner: additionalInfo?.owner,
    groupIds,
    vendorList: additionalInfo?.vendorList,
    vendorType: additionalInfo?.vendorType,
  };
  const validityCheckQuery = queryForVendorValidityCheck(payloadForQueryMaker);
  let finalQuery = { ...validityCheckQuery };

  const countQuery = { ...finalQuery, "multiQueryIndex.0": { $exists: true } };
  const chargeTemplateCount: any = await ChargeTemplateModel.findOne(
    countQuery
  ).lean();

  if (!chargeTemplateCount) return [];
  const queryForRouting = findLocationCombination(
    routing,
    additionalInfo?.groupInformation
  );
  const orCriteria = finalQuery?.$or;
  delete finalQuery?.$or;

  finalQuery = {
    ...finalQuery,
    moveType: { $ne: "BY_LEG" },
    $and: [
      {
        $or: queryForRouting?.map((singleRoutingQuery: any) => ({
          multiQueryIndex: singleRoutingQuery,
        })),
      },
    ],
  };

  if (orCriteria) {
    finalQuery.$and.push({ $or: orCriteria });
  }

  return await ChargeTemplateModel.find(finalQuery).lean();
};

const findLocationCombination = (driverOrders = [], groupInformation: any) => {
  const minWindowSize = 2;
  const maxWindowSize = Math.min(5, driverOrders.length); // Limit the max frame size to reduce memory usage
  let totalCombinations = [];
  for (let frame = minWindowSize; frame <= maxWindowSize; frame++) {
    const slicedOrder = driverOrders.slice(0, frame);
    const combination = getLocationCombination(slicedOrder, groupInformation);
    totalCombinations.push(combination);
  }

  // Flattening and filtering for unique combinations only
  const flatTotalCombination = _.uniqWith(totalCombinations.flat(), _.isEqual);

  return flatTotalCombination?.map((singleCombination: any) =>
    singleCombination?.filter(Boolean)
  );
};

const getLocationCombination = (
  slicedOrder: any = [],
  groupInformation: any
) => {
  const combinations: any[] = [];
  const memo: Record<string, string[]> = {}; 

  const groupCache: any = {};

  const buildGroupCache = (group: any) => {
    const result: Record<string, Set<string>> = {};
    for (const [key, valueArray] of Object.entries(group)) {
      result[key] = new Set(valueArray as any[]);
    }
    return result;
  };

  for (const [groupKey, groupValue] of Object.entries(groupInformation)) {
    groupCache[groupKey] = buildGroupCache(groupValue);
  }

  const generateCombinations = () => {
    const stack: { index: number; currentCombination: string[] }[] = [
      { index: 0, currentCombination: [] },
    ];

    while (stack.length > 0) {
      const { index, currentCombination } = stack.pop()!;
      if (index === slicedOrder.length) {
        combinations.push([...currentCombination]);
        continue;
      }

      const order = slicedOrder[index];
      const customerId = order.customerId?._id ?? order.customerId ?? "";
      const cacheKey = `${order.type}-${customerId}`;

      if (!memo[cacheKey]) {
        memo[cacheKey] = [
          `${order.type}-${customerId}`,
          ...(order.city && order.state
            ? [`${order.type}-${order.city},${order.state}`]
            : []),
          ...(order.zip_code ? [`${order.type}-${order.zip_code}`] : []),
          `${order.type}-${ProfileType.ALL_CUSTOMER}`,
          ...Array.from(groupCache.profile[customerId] || []).map(
            (profile) => `${order.type}-${profile}`
          ),
          ...Array.from(groupCache.cityState[customerId] || []).map(
            (profile) => `${order.type}-${profile}`
          ),
          ...Array.from(groupCache.zipCode[customerId] || []).map(
            (profile) => `${order.type}-${profile}`
          ),
        ];
      }

      for (const profile of memo[cacheKey]) {
        stack.push({
          index: index + 1,
          currentCombination: [...currentCombination, profile],
        });
      }
    }
  };

  generateCombinations();

  return combinations;
};

export const getVendorsFromRouting = (
  loadRoutingData: any,
  vendorType: string
): string[] => {
  let vendorProperty: string;
  switch (vendorType) {
    case VendorTypes.DRIVER:
      vendorProperty = "driver";
      break;
    case VendorTypes.CARRIER:
      vendorProperty = "drayosCarrier";
      break;
    // Add more cases if needed
    default:
      // Handle the default case if necessary
      break;
  }

  return Array.from(
    new Set(
      loadRoutingData
        ?.map(
          (item: any) => item?.[vendorProperty]?._id ?? item?.[vendorProperty]
        )
        ?.filter(Boolean)
    )
  );
};
