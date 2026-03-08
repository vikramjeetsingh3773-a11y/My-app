import { Sequelize, DataTypes, Model } from 'sequelize';
import { Logger } from '../utils/logger';

const logger = Logger.getInstance();

export class Database {
  private static instance: Database;
  private sequelize: Sequelize | null = null;

  private constructor() {}

  static getInstance(): Database {
    if (!Database.instance) {
      Database.instance = new Database();
    }
    return Database.instance;
  }

  async connect(): Promise<void> {
    try {
      this.sequelize = new Sequelize({
        database: process.env.DATABASE_NAME || 'battlemint',
        username: process.env.DATABASE_USER || 'postgres',
        password: process.env.DATABASE_PASSWORD || 'postgres',
        host: process.env.DATABASE_HOST || 'localhost',
        port: parseInt(process.env.DATABASE_PORT || '5432'),
        dialect: 'postgres',
        logging: process.env.NODE_ENV === 'development' ? console.log : false,
        pool: {
          max: 10,
          min: 2,
          acquire: 30000,
          idle: 10000
        },
        ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false
      });

      await this.sequelize.authenticate();
      logger.info('Database connection established successfully');
      
      // Sync models in development
      if (process.env.NODE_ENV === 'development') {
        await this.sequelize.sync({ alter: false });
      }
    } catch (error) {
      logger.error('Failed to connect to database:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (this.sequelize) {
      await this.sequelize.close();
      logger.info('Database connection closed');
    }
  }

  getSequelize(): Sequelize {
    if (!this.sequelize) {
      throw new Error('Database not initialized');
    }
    return this.sequelize;
  }

  // Transaction support
  async transaction(callback: (t: any) => Promise<any>): Promise<any> {
    if (!this.sequelize) {
      throw new Error('Database not initialized');
    }
    return this.sequelize.transaction(callback);
  }
}

// Models
export class User extends Model {
  declare id: string;
  declare username: string;
  declare email: string;
  declare phone: string;
  declare password_hash: string;
  declare freefire_uid: string;
  declare wallet_balance: number;
  declare total_wins: number;
  declare total_earnings: number;
  declare rank: number;
  declare avatar_url: string;
  declare is_banned: boolean;
  declare is_verified: boolean;
  declare phone_verified: boolean;
}

export class Tournament extends Model {
  declare id: string;
  declare name: string;
  declare description: string;
  declare game_mode: string;
  declare entry_fee: number;
  declare prize_pool: number;
  declare max_players: number;
  declare current_players: number;
  declare start_time: Date;
  declare end_time: Date;
  declare room_id: string;
  declare room_password: string;
  declare map_type: string;
  declare status: string;
  declare created_by: string;
}

export class Participant extends Model {
  declare id: string;
  declare user_id: string;
  declare tournament_id: string;
  declare placement: number;
  declare prize_won: number;
  declare screenshot_url: string;
  declare status: string;
}

export class Transaction extends Model {
  declare id: string;
  declare user_id: string;
  declare amount: number;
  declare type: string;
  declare status: string;
  declare reference_id: string;
  declare notes: string;
}

export class Withdrawal extends Model {
  declare id: string;
  declare user_id: string;
  declare amount: number;
  declare upi_id: string;
  declare screenshot_url: string;
  declare status: string;
  declare admin_notes: string;
}

export class AdminSettings extends Model {
  declare id: string;
  declare setting_key: string;
  declare setting_value: string;
  declare data_type: string;
  declare updated_by: string;
}

export class Notification extends Model {
  declare id: string;
  declare user_id: string;
  declare title: string;
  declare body: string;
  declare type: string;
  declare data: any;
  declare is_read: boolean;
}

export class BannedUser extends Model {
  declare id: string;
  declare user_id: string;
  declare reason: string;
  declare banned_by: string;
  declare lifted_at: Date;
}

export function initializeModels(sequelize: Sequelize): void {
  User.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },
      username: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true
      },
      email: {
        type: DataTypes.STRING(255),
        allowNull: false,
        unique: true
      },
      phone: {
        type: DataTypes.STRING(15),
        allowNull: false
      },
      password_hash: {
        type: DataTypes.STRING(255),
        allowNull: false
      },
      freefire_uid: {
        type: DataTypes.STRING(20),
        unique: true
      },
      wallet_balance: {
        type: DataTypes.DECIMAL(10, 2),
        defaultValue: 0
      },
      total_wins: {
        type: DataTypes.INTEGER,
        defaultValue: 0
      },
      total_earnings: {
        type: DataTypes.DECIMAL(12, 2),
        defaultValue: 0
      },
      rank: {
        type: DataTypes.INTEGER,
        defaultValue: 0
      },
      avatar_url: DataTypes.TEXT,
      is_banned: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
      },
      is_verified: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
      },
      phone_verified: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
      }
    },
    {
      sequelize,
      tableName: 'users',
      timestamps: true,
      underscored: true
    }
  );

  Tournament.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },
      name: {
        type: DataTypes.STRING(100),
        allowNull: false
      },
      description: DataTypes.TEXT,
      game_mode: {
        type: DataTypes.STRING(50),
        allowNull: false
      },
      entry_fee: {
        type: DataTypes.DECIMAL(8, 2),
        allowNull: false
      },
      prize_pool: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false
      },
      max_players: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      current_players: {
        type: DataTypes.INTEGER,
        defaultValue: 0
      },
      start_time: {
        type: DataTypes.DATE,
        allowNull: false
      },
      end_time: DataTypes.DATE,
      room_id: DataTypes.STRING(50),
      room_password: DataTypes.STRING(50),
      map_type: DataTypes.STRING(50),
      status: {
        type: DataTypes.STRING(20),
        defaultValue: 'upcoming'
      },
      created_by: DataTypes.UUID
    },
    {
      sequelize,
      tableName: 'tournaments',
      timestamps: true,
      underscored: true
    }
  );

  Participant.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },
      user_id: {
        type: DataTypes.UUID,
        allowNull: false
      },
      tournament_id: {
        type: DataTypes.UUID,
        allowNull: false
      },
      placement: DataTypes.INTEGER,
      prize_won: {
        type: DataTypes.DECIMAL(10, 2),
        defaultValue: 0
      },
      screenshot_url: DataTypes.TEXT,
      status: {
        type: DataTypes.STRING(20),
        defaultValue: 'joined'
      }
    },
    {
      sequelize,
      tableName: 'participants',
      timestamps: true,
      underscored: true
    }
  );

  Transaction.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },
      user_id: {
        type: DataTypes.UUID,
        allowNull: false
      },
      amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
      },
      type: {
        type: DataTypes.STRING(20),
        allowNull: false
      },
      status: {
        type: DataTypes.STRING(20),
        defaultValue: 'pending'
      },
      reference_id: DataTypes.STRING(100),
      notes: DataTypes.TEXT
    },
    {
      sequelize,
      tableName: 'transactions',
      timestamps: true,
      underscored: true
    }
  );

  Withdrawal.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },
      user_id: {
        type: DataTypes.UUID,
        allowNull: false
      },
      amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
      },
      upi_id: {
        type: DataTypes.STRING(100),
        allowNull: false
      },
      screenshot_url: DataTypes.TEXT,
      status: {
        type: DataTypes.STRING(20),
        defaultValue: 'pending'
      },
      admin_notes: DataTypes.TEXT
    },
    {
      sequelize,
      tableName: 'withdrawals',
      timestamps: true,
      underscored: true
    }
  );

  AdminSettings.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },
      setting_key: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true
      },
      setting_value: DataTypes.TEXT,
      data_type: DataTypes.STRING(20),
      updated_by: DataTypes.UUID
    },
    {
      sequelize,
      tableName: 'admin_settings',
      timestamps: true,
      underscored: true
    }
  );

  Notification.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },
      user_id: {
        type: DataTypes.UUID,
        allowNull: false
      },
      title: {
        type: DataTypes.STRING(255),
        allowNull: false
      },
      body: DataTypes.TEXT,
      type: DataTypes.STRING(50),
      data: DataTypes.JSONB,
      is_read: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
      }
    },
    {
      sequelize,
      tableName: 'notifications',
      timestamps: true,
      underscored: true
    }
  );

  BannedUser.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },
      user_id: {
        type: DataTypes.UUID,
        allowNull: false
      },
      reason: {
        type: DataTypes.TEXT,
        allowNull: false
      },
      banned_by: DataTypes.UUID,
      lifted_at: DataTypes.DATE
    },
    {
      sequelize,
      tableName: 'banned_users',
      timestamps: true,
      underscored: true
    }
  );

  // Set up associations
  User.hasMany(Tournament, { foreignKey: 'created_by' });
  User.hasMany(Participant, { foreignKey: 'user_id' });
  User.hasMany(Transaction, { foreignKey: 'user_id' });
  User.hasMany(Withdrawal, { foreignKey: 'user_id' });

  Tournament.hasMany(Participant, { foreignKey: 'tournament_id' });
}
