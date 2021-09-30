export interface AstatineItem {
    address: string,
    weight: number,
}

export interface ContentType {
  contentType: string,
  count: number
}

export interface BlockInfo {
    weaveSize: number,
    difficulty: number,
    blockSize: number,
}

export interface Results {
  startDate: Date,
  endDate: Date,
  totalArDriveUsers: number,
  newArDriveUsers: number,
  drivesFound: number,
  publicDrives: number,
  privateDrives: number,
  totalDataSize: number,
  totalBundledData: number,
  totalWebAppBundledData: number,
  totalDesktopBundledData: number,
  privateData: number,
  publicData: number,
  totalFiles: number,
  webAppFiles: number,
  desktopAppFiles: number,
  mobileAppFiles: number,
  coreAppFiles: number,
  cliAppFiles: number,
  arConnectFiles: number;
  privateFiles: number,
  publicFiles: number,
  totalCommunityFees: number,
  totalMiningFees: number
  desktopAppFees: number,
  webAppFees: number,
  mobileAppFees: number,
  coreAppFees: number,
  arConnectFees: number,
  cliAppFees: number,
  publicArFees: number,
  privateArFees: number,
  contentTypes: ContentType[] | undefined,
  averageUserSize: number,
  averageUserFiles: number,
  blockHeight: number,
  weaveSize: number,
  blockSize: number,
  difficulty: number,
  tokenHolders: number,
}

export interface ArDriveStat {
    address: string,
    privacy: string,
    appName: string,
    driveId: string,
    tx: string,
    data: number,
    blockTimeStamp: Date
}

export interface FileInfo {
  address: string,
  fileId: string,
  parentFolderId: string,
  driveId: string,
  privacy: string,
  tx: string,
  blockTimeStamp: Date
}

export interface BlockDate {
  blockHeight: number;
  blockTimeStamp: number;
  blockHash: string;
  friendlyDate: string;
}

export interface ArDriveCommunityFee {
owner: string,
recipient: string,
friendlyName: string,
appName: string,
appVersion: string,
tip: string,
type: string,
amountAR: number,
exchangeRate: number,
amountUSD: number,
currentPrice: number,
costBasis: number,
blockHeight: number,
blockTime: number,
friendlyDate: string
}

export interface ArDriveTokenHolder {
  address: string,
  unlockedArDriveTokens: number,
  lockedArDriveTokens: number,
  totalArDriveTokens: number,
  voteWeight: number,
  arweaveTokens: number
}

export interface AstatineReward {
  owner: string,
  target: string,
  appName: string,
  appVersion: string,
  cannon: string,
  quantity: number,
  completion: number,
  blockHeight: number,
  blockTime: number,
  friendlyDate: string,
  validSmartweaveTx: boolean
}
