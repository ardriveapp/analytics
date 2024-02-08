import { Tags } from "warp-contracts";

export interface InfernoStatus {
  jobStart: Date;
  jobEnd: Date;
  gqlStart: string;
  gqlEnd: string;
  totalGqlRequests: number;
  totalDataSize: number;
  totalFiles: number;
  infernoUsers: number;
  elligibleUsers: number;
  allResults: InfernoUser[];
}

export interface AstatineItem {
  address: string;
  weight: number;
}

export interface InfernoUser {
  address: string;
  size: number;
  files: number;
  elligible: boolean;
  rank: number;
}

export interface ContentType {
  contentType: string;
  count: number;
}

export interface BlockInfo {
  weaveSize: number;
  difficulty: number;
  blockSize: number;
  transactionCount: number;
  timestamp: number;
}

export interface Results {
  startDate: Date;
  endDate: Date;
  totalArDriveUsers: number;
  newArDriveUsers: number;
  drivesFound: number;
  publicDrives: number;
  privateDrives: number;
  totalDataSize: number;
  privateData: number;
  publicData: number;
  totalFiles: number;
  webAppFiles: number;
  desktopAppFiles: number;
  mobileAppFiles: number;
  coreAppFiles: number;
  cliAppFiles: number;
  syncAppFiles: number;
  arConnectFiles: number;
  privateFiles: number;
  publicFiles: number;
  totalCommunityFees: number;
  totalMiningFees: number;
  desktopAppFees: number;
  webAppFees: number;
  mobileAppFees: number;
  coreAppFees: number;
  arConnectFees: number;
  cliAppFees: number;
  publicArFees: number;
  privateArFees: number;
  contentTypes: ContentType[] | undefined;
  averageUserSize: number;
  averageUserFiles: number;
  blockHeight: number;
  weaveSize: number;
  blockSize: number;
  difficulty: number;
  tokenHolders: number;
}

export interface ArDriveStat {
  address: string;
  privacy: string;
  appName: string;
  appVersion: string;
  appPlatform: string;
  driveId: string;
  tx: string;
  data: number;
  blockTimeStamp: Date;
  blockHeight: number;
}

export interface FileInfo {
  address: string;
  fileId: string;
  parentFolderId: string;
  driveId: string;
  privacy: string;
  tx: string;
  blockTimeStamp: Date;
}

export interface BlockDate {
  blockHeight: number;
  blockTimeStamp: number;
  blockHash: string;
  friendlyDate: string;
}

export interface ArDriveCommunityFee {
  owner: string;
  recipient: string;
  friendlyName: string;
  appName: string;
  appVersion: string;
  tip: string;
  type: string;
  amountAR: number;
  exchangeRate: number;
  amountUSD: number;
  currentPrice: number;
  costBasis: number;
  blockHeight: number;
  blockTime: number;
  friendlyDate: string;
}

export interface ArDriveTokenHolder {
  address: string;
  unlockedArDriveTokens: number;
  lockedArDriveTokens: number;
  totalArDriveTokens: number;
  voteWeight: number;
  arweaveTokens: number;
}

export interface TokenHolders {
  [address: string]: {
    unlockedTokens: number;
    lockedTokens: number;
    totalTokens: number;
    voteWeight: number;
    arweaveTokens: number;
    vaults?: {
      [index: string]: [
        {
          balance: number; // Positive integer, the amount held in this vault
          start: number; // At what block the lock starts.
          end: number; // At what block the lock ends.
          friendlyEndDate: string;
        }
      ];
    };
  };
}

export interface TokenVault {
  [index: string]: [
    {
      balance: number; // Positive integer, the amount held in this vault
      start: number; // At what block the lock starts.
      end: number; // At what block the lock ends.
      friendlyEndDate: string;
    }
  ];
}

export interface Vault {
  balance: number; // Positive integer, the amount held in this vault
  start: number; // At what block the lock starts.
  end: number; // At what block the lock ends.
}

export interface AstatineReward {
  owner: string;
  target: string;
  appName: string;
  appVersion: string;
  cannon: string;
  quantity: number;
  completion: number;
  blockHeight: number;
  blockTime: number;
  friendlyDate: string;
  validSmartweaveTx: boolean;
}

export interface SmartweaveTx {
  id: string;
  owner: string;
  target: string;
  appName: string;
  appVersion: string;
  quantity: number;
  blockHeight: number;
  blockTime: number;
  friendlyDate: string;
  validSmartweaveTx: boolean;
}

export interface ArFSFileTx {
  appName: string;
  appVersion: string;
  arfsVersion: string;
  appPlatform?: string;
  appPlatformVersion?: string;
  owner: string;
  dataSize: number;
  dataItemSize: number;
  private: boolean;
  fee: number;
  contentType: string;
  bundledIn: string;
  id: string;
  blockHeight: number;
  blockTime: number;
  friendlyDate: string;
  tags?: Tags;
}

export interface ArFSFolderTx {
  appName: string;
  appVersion: string;
  arfsVersion: string;
  appPlatform?: string;
  appPlatformVersion?: string;
  owner: string;
  dataSize: number;
  dataItemSize: number;
  private: boolean;
  fee: number;
  contentType: string;
  bundledIn: string;
  id: string;
  blockHeight: number;
  blockTime: number;
  friendlyDate: string;
  tags?: Tags;
}

export interface ArFSSnapshotTx {
  appName: string;
  appVersion: string;
  arfsVersion: string;
  appPlatform?: string;
  appPlatformVersion?: string;
  owner: string;
  dataSize: number;
  dataItemSize: number;
  private: boolean;
  fee: number;
  bundledIn: string;
  blockStart: number;
  id: string;
  blockHeight: number;
  blockTime: number;
  friendlyDate: string;
  tags?: Tags;
}

export interface ArFSDriveTx {
  appName: string;
  appVersion: string;
  appPlatform?: string;
  appPlatformVersion?: string;
  arfsVersion: string;
  owner: string;
  dataSize: number;
  dataItemSize: number;
  private: boolean;
  fee: number;
  contentType: string;
  bundledIn: string;
  id: string;
  blockHeight: number;
  blockTime: number;
  friendlyDate: string;
  tags?: Tags;
}

export interface ArFSFileDataTx {
  appName: string;
  appVersion: string;
  appPlatform?: string;
  appPlatformVersion?: string;
  owner: string;
  dataSize: number;
  dataItemSize: number;
  private: boolean;
  fee: number;
  quantity: number;
  contentType: string;
  bundledIn: string;
  id: string;
  blockHeight: number;
  blockTime: number;
  friendlyDate: string;
  tags?: Tags;
}

export interface ArFSTipTx {
  appName: string;
  appVersion: string;
  appPlatform?: string;
  appPlatformVersion?: string;
  owner: string;
  quantity: number;
  id: string;
  blockHeight: number;
  blockTime: number;
  friendlyDate: string;
  tags?: Tags;
}

export interface BundleTx {
  txId?: string;
  appName: string;
  appVersion: string;
  appPlatform?: string;
  appPlatformVersion?: string;
  dataSize: number;
  fee: number;
  quantity: number;
  owner: string;
  timeStamp: number | string;
  bundledInTxId?: string;
  blockHeight?: number;
  tags?: Tags;
}

export interface ResultSet {
  bundleTxs: BundleTx[];
  fileDataTxs: ArFSFileDataTx[];
  fileTxs: ArFSFileTx[];
  folderTxs: ArFSFolderTx[];
  driveTxs: ArFSDriveTx[];
  snapshotTxs: ArFSSnapshotTx[];
  tipTxs: ArFSTipTx[];
  foundUsers: string[];
  lastBlock?: number;
}

export interface Uploader {
  [uploaderName: string]: number;
}
