const db = require('../db/client');
const debug = require('debug')('subscription-management:users-service');

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

/**
 * Get all users with pagination support
 * @param {number} limit - Number of users to fetch (default: 20, max: 100)
 * @param {number} offset - Number of users to skip (default: 0)
 * @returns {Promise<{users: Array, total: number, limit: number, offset: number}>}
 */
async function getAllUsers(limit = DEFAULT_LIMIT, offset = 0) {
  // Validate and sanitize pagination parameters
  const validLimit = Math.min(Math.max(parseInt(limit) || DEFAULT_LIMIT, 1), MAX_LIMIT);
  const validOffset = Math.max(parseInt(offset) || 0, 0);

  try {
    // Fetch users with pagination
    const usersResult = await db.query(
      `SELECT 
        id, 
        clerk_user_id, 
        email, 
        display_name, 
        created_at, 
        updated_at 
       FROM users 
       ORDER BY created_at DESC 
       LIMIT $1 OFFSET $2`,
      [validLimit, validOffset]
    );

    // Fetch total count
    const countResult = await db.query('SELECT COUNT(*) as total FROM users');
    const total = parseInt(countResult.rows[0].total, 10);

    debug(`Fetched ${usersResult.rows.length} users, total: ${total}`);

    return {
      users: usersResult.rows,
      total,
      limit: validLimit,
      offset: validOffset,
    };
  } catch (error) {
    debug('Error fetching users:', error);
    throw error;
  }
}

/**
 * Get a single user by ID
 * @param {string} id - User UUID
 * @returns {Promise<Object>}
 */
async function getUserById(id) {
  try {
    const result = await db.query(
      `SELECT 
        id, 
        clerk_user_id, 
        email, 
        display_name, 
        created_at, 
        updated_at 
       FROM users 
       WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return null;
    }

    debug(`Fetched user: ${id}`);
    return result.rows[0];
  } catch (error) {
    debug('Error fetching user:', error);
    throw error;
  }
}

module.exports = {
  getAllUsers,
  getUserById,
};
