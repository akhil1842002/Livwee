import mongoose, { ClientSession } from 'mongoose';

/**
 * Checks if the current MongoDB connection topology supports multi-document transactions.
 * Transactions require Replica Sets ('ReplicaSetWithPrimary', 'ReplicaSetNoPrimary') or Sharded clusters ('Sharded').
 */
export function supportsTransactions(): boolean {
  try {
    const client = mongoose.connection.getClient() as any;
    if (!client) return false;
    const topologyType = client.topology?.description?.type;
    return topologyType === 'ReplicaSetWithPrimary' || topologyType === 'ReplicaSetNoPrimary' || topologyType === 'Sharded';
  } catch (err) {
    return false;
  }
}

/**
 * Executes work within a Mongoose transaction if supported by MongoDB topology.
 * If MongoDB is running as a standalone instance (no replica set), falls back gracefully
 * to running the work without a session/transaction so operations succeed.
 */
export async function runInTransaction<T>(
  work: (session: ClientSession | null) => Promise<T>
): Promise<T> {
  if (!supportsTransactions()) {
    // Standalone MongoDB instance — run directly without session/transaction
    return await work(null);
  }

  let session: ClientSession | null = null;
  try {
    session = await mongoose.startSession();
    session.startTransaction();
    const result = await work(session);
    await session.commitTransaction();
    session.endSession();
    return result;
  } catch (error) {
    if (session) {
      try {
        await session.abortTransaction();
      } catch (abortErr) {
        // ignore abort error
      }
      session.endSession();
    }
    throw error;
  }
}
