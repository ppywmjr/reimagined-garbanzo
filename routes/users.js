var express = require('express');
var router = express.Router();
var debug = require('debug')('subscription-management:routes:users');
var usersService = require('../services/users');

/**
 * GET /users
 * Retrieve all users with pagination support
 * Query parameters:
 *   - limit: number of users to fetch (default: 20, max: 100)
 *   - offset: number of users to skip (default: 0)
 */
router.get('/', async function(req, res, next) {
  try {
    const { limit, offset } = req.query;
    
    debug(`GET /users - limit: ${limit}, offset: ${offset}`);
    
    const result = await usersService.getAllUsers(limit, offset);
    
    res.status(200).json({
      success: true,
      data: result.users,
      pagination: {
        total: result.total,
        limit: result.limit,
        offset: result.offset,
        hasMore: result.offset + result.limit < result.total,
      },
    });
  } catch (error) {
    debug('Error in GET /users:', error);
    next(error);
  }
});

/**
 * GET /users/:id
 * Retrieve a single user by ID
 */
router.get('/:id', async function(req, res, next) {
  try {
    const { id } = req.params;
    
    // Basic UUID validation
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid user ID format',
      });
    }
    
    debug(`GET /users/:id - id: ${id}`);
    
    const user = await usersService.getUserById(id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }
    
    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    debug('Error in GET /users/:id:', error);
    next(error);
  }
});

module.exports = router;
