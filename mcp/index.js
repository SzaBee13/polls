#!/usr/bin/env node

/**
 * MCP Server for Polls Project
 * Allows LLMs to create and manage polls via Model Context Protocol
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '.env') });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const USERNAME = process.env.USERNAME || 'mcp-user';
const DISPLAY_NAME = process.env.DISPLAY_NAME || 'MCP User';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Error: SUPABASE_URL and SUPABASE_ANON_KEY must be set in .env file');
  process.exit(1);
}

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

class PollsMCPServer {
  constructor() {
    this.server = new Server(
      {
        name: 'polls-mcp-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupHandlers();
    this.setupErrorHandling();
  }

  setupErrorHandling() {
    this.server.onerror = (error) => {
      console.error('[MCP Error]', error);
    };

    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  setupHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'create_poll_suggestion',
          description: 'Submit a new poll suggestion that can be reviewed and approved by admins. Use this when you want to suggest a poll idea.',
          inputSchema: {
            type: 'object',
            properties: {
              question: {
                type: 'string',
                description: 'The poll question (minimum 8 characters)',
              },
              options: {
                type: 'array',
                description: 'Array of 2-8 poll options',
                items: { type: 'string' },
                minItems: 2,
                maxItems: 8,
              },
            },
            required: ['question', 'options'],
          },
        },
        {
          name: 'create_poll_in_bank',
          description: 'Create a poll directly in the poll bank. These polls can be selected as daily polls. Use this for creating approved polls.',
          inputSchema: {
            type: 'object',
            properties: {
              question: {
                type: 'string',
                description: 'The poll question',
              },
              options: {
                type: 'array',
                description: 'Array of 2-8 poll options',
                items: { type: 'string' },
                minItems: 2,
                maxItems: 8,
              },
            },
            required: ['question', 'options'],
          },
        },
        {
          name: 'schedule_daily_poll',
          description: 'Schedule a poll for a specific date. The poll will appear on that date.',
          inputSchema: {
            type: 'object',
            properties: {
              poll_date: {
                type: 'string',
                description: 'Date in YYYY-MM-DD format',
              },
              question: {
                type: 'string',
                description: 'The poll question',
              },
              options: {
                type: 'array',
                description: 'Array of 2-8 poll options',
                items: { type: 'string' },
                minItems: 2,
                maxItems: 8,
              },
            },
            required: ['poll_date', 'question', 'options'],
          },
        },
        {
          name: 'list_polls',
          description: 'List recent daily polls with their vote counts',
          inputSchema: {
            type: 'object',
            properties: {
              limit: {
                type: 'number',
                description: 'Number of polls to retrieve (default: 10, max: 50)',
                default: 10,
              },
            },
          },
        },
        {
          name: 'get_poll_results',
          description: 'Get detailed results for a specific poll by ID',
          inputSchema: {
            type: 'object',
            properties: {
              poll_id: {
                type: 'string',
                description: 'The UUID of the poll',
              },
            },
            required: ['poll_id'],
          },
        },
        {
          name: 'list_poll_suggestions',
          description: 'List pending poll suggestions that need review',
          inputSchema: {
            type: 'object',
            properties: {
              status: {
                type: 'string',
                description: 'Filter by status: pending, approved, or rejected (default: pending)',
                enum: ['pending', 'approved', 'rejected'],
                default: 'pending',
              },
              limit: {
                type: 'number',
                description: 'Number of suggestions to retrieve (default: 20)',
                default: 20,
              },
            },
          },
        },
      ],
    }));

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'create_poll_suggestion':
            return await this.createPollSuggestion(args);
          case 'create_poll_in_bank':
            return await this.createPollInBank(args);
          case 'schedule_daily_poll':
            return await this.scheduleDailyPoll(args);
          case 'list_polls':
            return await this.listPolls(args);
          case 'get_poll_results':
            return await this.getPollResults(args);
          case 'list_poll_suggestions':
            return await this.listPollSuggestions(args);
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${error.message}`,
            },
          ],
          isError: true,
        };
      }
    });
  }

  normalizeOptions(options) {
    const cleaned = options.map((o) => String(o).trim()).filter(Boolean);
    const deduped = [];
    for (const opt of cleaned) {
      if (!deduped.some((x) => x.toLowerCase() === opt.toLowerCase())) {
        deduped.push(opt);
      }
    }
    return deduped;
  }

  validatePollData(question, options) {
    if (!question || question.trim().length < 8) {
      throw new Error('Question must be at least 8 characters long');
    }

    if (!Array.isArray(options) || options.length < 2 || options.length > 8) {
      throw new Error('Options must be an array of 2-8 items');
    }

    const normalized = this.normalizeOptions(options);
    if (normalized.length < 2) {
      throw new Error('Must have at least 2 unique non-empty options');
    }

    return { question: question.trim(), options: normalized };
  }

  async createPollSuggestion(args) {
    const { question, options } = this.validatePollData(args.question, args.options);

    // Note: This requires authentication, so it will fail with anon key
    // You might need to use the service role key or implement auth flow
    const { data, error } = await supabase
      .from('poll_suggestions')
      .insert({
        question,
        options,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create poll suggestion: ${error.message}`);
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              success: true,
              message: 'Poll suggestion created successfully',
              suggestion_id: data.id,
              question: data.question,
              options: data.options,
              status: data.status,
            },
            null,
            2
          ),
        },
      ],
    };
  }

  async createPollInBank(args) {
    const { question, options } = this.validatePollData(args.question, args.options);

    // Note: This might require service role key depending on RLS policies
    const { data, error } = await supabase
      .from('poll_bank')
      .insert({
        question,
        options,
        created_by_username: USERNAME,
        created_by_display_name: DISPLAY_NAME,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create poll in bank: ${error.message}`);
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              success: true,
              message: 'Poll created in bank successfully',
              poll_id: data.id,
              question: data.question,
              options: data.options,
            },
            null,
            2
          ),
        },
      ],
    };
  }

  async scheduleDailyPoll(args) {
    const { poll_date } = args;
    const { question, options } = this.validatePollData(args.question, args.options);

    // Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(poll_date)) {
      throw new Error('poll_date must be in YYYY-MM-DD format');
    }

    const { data, error } = await supabase
      .from('daily_polls')
      .insert({
        poll_date,
        question,
        options,
        created_by_username: USERNAME,
        created_by_display_name: DISPLAY_NAME,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to schedule daily poll: ${error.message}`);
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              success: true,
              message: `Poll scheduled for ${poll_date}`,
              poll_id: data.id,
              poll_date: data.poll_date,
              question: data.question,
              options: data.options,
            },
            null,
            2
          ),
        },
      ],
    };
  }

  async listPolls(args) {
    const limit = Math.min(args?.limit || 10, 50);

    const { data, error } = await supabase
      .from('daily_polls')
      .select('*, vote_counts(option_index, votes)')
      .order('poll_date', { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`Failed to list polls: ${error.message}`);
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              success: true,
              count: data.length,
              polls: data.map((poll) => ({
                id: poll.id,
                date: poll.poll_date,
                question: poll.question,
                options: poll.options,
                votes: poll.vote_counts,
                total_votes: poll.vote_counts.reduce((sum, vc) => sum + vc.votes, 0),
              })),
            },
            null,
            2
          ),
        },
      ],
    };
  }

  async getPollResults(args) {
    const { poll_id } = args;

    if (!poll_id) {
      throw new Error('poll_id is required');
    }

    const { data, error } = await supabase
      .from('daily_polls')
      .select('*, vote_counts(option_index, votes)')
      .eq('id', poll_id)
      .single();

    if (error) {
      throw new Error(`Failed to get poll results: ${error.message}`);
    }

    const total_votes = data.vote_counts.reduce((sum, vc) => sum + vc.votes, 0);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              success: true,
              poll: {
                id: data.id,
                date: data.poll_date,
                question: data.question,
                options: data.options,
                results: data.options.map((option, index) => {
                  const voteCount =
                    data.vote_counts.find((vc) => vc.option_index === index)?.votes || 0;
                  return {
                    option,
                    votes: voteCount,
                    percentage: total_votes > 0 ? ((voteCount / total_votes) * 100).toFixed(1) : '0.0',
                  };
                }),
                total_votes,
              },
            },
            null,
            2
          ),
        },
      ],
    };
  }

  async listPollSuggestions(args) {
    const status = args?.status || 'pending';
    const limit = args?.limit || 20;

    const { data, error } = await supabase
      .from('poll_suggestions')
      .select('*')
      .eq('status', status)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`Failed to list poll suggestions: ${error.message}`);
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              success: true,
              count: data.length,
              suggestions: data.map((suggestion) => ({
                id: suggestion.id,
                question: suggestion.question,
                options: suggestion.options,
                status: suggestion.status,
                created_at: suggestion.created_at,
              })),
            },
            null,
            2
          ),
        },
      ],
    };
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Polls MCP Server running on stdio');
  }
}

// Start the server
const server = new PollsMCPServer();
server.run().catch(console.error);
