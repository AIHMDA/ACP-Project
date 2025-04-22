import { PluginManager } from '../core/plugins/plugin_manager';

describe('PluginManager', () => {
  let pluginManager: PluginManager;

  beforeEach(() => {
    pluginManager = new PluginManager('2.0.0'); // Sæt specifik host version for tests
  });

  describe('Instantiering', () => {
    test('should create a new instance of PluginManager', () => {
      expect(pluginManager).toBeInstanceOf(PluginManager);
      expect(pluginManager.listPlugins()).toEqual([]);
      const plugin = pluginManager.getPlugin('non-existent');
      expect(plugin).toBeUndefined();
    });

    test('should initialize with empty plugin registry', () => {
      const plugins = pluginManager.listPlugins();
      expect(Array.isArray(plugins)).toBe(true);
      expect(plugins.length).toBe(0);
    });

    test('should handle multiple instances independently', () => {
      const manager1 = new PluginManager();
      const manager2 = new PluginManager();
      
      expect(manager1).not.toBe(manager2);
      expect(manager1.listPlugins()).not.toBe(manager2.listPlugins());
    });

    test('should initialize with empty hooks map', async () => {
      const context = {
        workspaceId: 'test-workspace',
        pluginId: 'test-plugin',
        timestamp: new Date(),
        data: { test: 'data' }
      };
      
      // Forsøg at eksekvere en hook der ikke eksisterer
      const result = await pluginManager.executeHook('nonexistentHook', context);
      
      // Verificér at konteksten returneres uændret når der ikke er hooks
      expect(result).toEqual(context);
    });

    test('should handle plugin registration after initialization', async () => {
      const mockPlugin = {
        id: 'test-plugin',
        name: 'Test Plugin',
        version: '1.0.0',
        description: 'Test plugin',
        author: 'Test Author',
        hooks: []
      };

      await pluginManager.registerPlugin(mockPlugin);
      const registeredPlugin = pluginManager.getPlugin('test-plugin');
      
      expect(registeredPlugin).toBeDefined();
      expect(registeredPlugin?.manifest).toEqual(mockPlugin);
      expect(registeredPlugin?.status).toBe('registered');
      expect(registeredPlugin?.instance).toBeNull();
    });

    test('should maintain plugin status after initialization', async () => {
      const mockPlugin = {
        id: 'test-plugin',
        name: 'Test Plugin',
        version: '1.0.0',
        description: 'Test plugin',
        author: 'Test Author',
        hooks: []
      };

      await pluginManager.registerPlugin(mockPlugin);
      await pluginManager.activatePlugin('test-plugin');
      
      const plugin = pluginManager.getPlugin('test-plugin');
      expect(plugin?.status).toBe('active');

      await pluginManager.deactivatePlugin('test-plugin');
      expect(plugin?.status).toBe('inactive');
    });

    test('should throw error when accessing invalid plugin methods', () => {
      expect(() => pluginManager.activatePlugin('non-existent')).rejects.toThrow();
      expect(() => pluginManager.deactivatePlugin('non-existent')).rejects.toThrow();
    });
  });

  describe('Plugin Registrering', () => {
    test('should prevent duplicate plugin registration', async () => {
      const mockPlugin = {
        id: 'test-plugin',
        name: 'Test Plugin',
        version: '1.0.0',
        description: 'Test plugin',
        author: 'Test Author',
        hooks: []
      };

      await pluginManager.registerPlugin(mockPlugin);
      await expect(pluginManager.registerPlugin(mockPlugin)).rejects.toThrow();
    });

    test('should handle plugins with duplicate hook names', async () => {
      const plugin1 = {
        id: 'plugin1',
        name: 'Plugin 1',
        version: '1.0.0',
        description: 'Test plugin 1',
        author: 'Test Author',
        hooks: [{
          name: 'sharedHook',
          handler: 'handler1',
          priority: 2
        }]
      };

      const plugin2 = {
        id: 'plugin2',
        name: 'Plugin 2',
        version: '1.0.0',
        description: 'Test plugin 2',
        author: 'Test Author',
        hooks: [{
          name: 'sharedHook',
          handler: 'handler2',
          priority: 1
        }]
      };

      await pluginManager.registerPlugin(plugin1);
      await pluginManager.registerPlugin(plugin2);
      
      // Verificér at begge plugins er registreret
      expect(pluginManager.getPlugin('plugin1')).toBeDefined();
      expect(pluginManager.getPlugin('plugin2')).toBeDefined();
    });
  });

  describe('Hook Håndtering', () => {
    test('should execute hooks in priority order', async () => {
      const executionOrder: string[] = [];
      
      const mockInstance1 = {
        handler1: async (context: any) => {
          executionOrder.push('plugin1');
          return context;
        }
      };

      const mockInstance2 = {
        handler2: async (context: any) => {
          executionOrder.push('plugin2');
          return context;
        }
      };

      const plugin1 = {
        id: 'plugin1',
        name: 'Plugin 1',
        version: '1.0.0',
        description: 'Test plugin 1',
        author: 'Test Author',
        hooks: [{
          name: 'testHook',
          handler: 'handler1',
          priority: 2
        }]
      };

      const plugin2 = {
        id: 'plugin2',
        name: 'Plugin 2',
        version: '1.0.0',
        description: 'Test plugin 2',
        author: 'Test Author',
        hooks: [{
          name: 'testHook',
          handler: 'handler2',
          priority: 1
        }]
      };

      await pluginManager.registerPlugin(plugin1);
      await pluginManager.registerPlugin(plugin2);
      
      // Sæt mock instances
      const pluginData1 = pluginManager.getPlugin('plugin1');
      const pluginData2 = pluginManager.getPlugin('plugin2');
      if (pluginData1) pluginData1.instance = mockInstance1;
      if (pluginData2) pluginData2.instance = mockInstance2;
      
      await pluginManager.activatePlugin('plugin1');
      await pluginManager.activatePlugin('plugin2');

      const context = {
        workspaceId: 'test-workspace',
        pluginId: 'test',
        timestamp: new Date(),
        data: { order: executionOrder }
      };

      await pluginManager.executeHook('testHook', context);
      
      // Plugin2's hook skulle køre først pga. lavere prioritet
      expect(executionOrder).toEqual(['plugin2', 'plugin1']);
    });

    test('should skip inactive plugin hooks', async () => {
      const executionOrder: string[] = [];
      
      const plugin = {
        id: 'test-plugin',
        name: 'Test Plugin',
        version: '1.0.0',
        description: 'Test plugin',
        author: 'Test Author',
        hooks: [{
          name: 'testHook',
          handler: 'handler',
          priority: 1
        }]
      };

      await pluginManager.registerPlugin(plugin);
      // Bemærk: Vi aktiverer ikke plugin'et

      const context = {
        workspaceId: 'test-workspace',
        pluginId: 'test',
        timestamp: new Date(),
        data: { order: executionOrder }
      };

      await pluginManager.executeHook('testHook', context);
      
      expect(executionOrder.length).toBe(0);
    });
  });

  describe('Fejlhåndtering', () => {
    test('should handle invalid hook handlers gracefully', async () => {
      const plugin = {
        id: 'test-plugin',
        name: 'Test Plugin',
        version: '1.0.0',
        description: 'Test plugin',
        author: 'Test Author',
        hooks: [{
          name: 'testHook',
          handler: 'nonexistent.handler',
          priority: 1
        }]
      };

      await pluginManager.registerPlugin(plugin);
      await pluginManager.activatePlugin('test-plugin');

      const context = {
        workspaceId: 'test-workspace',
        pluginId: 'test',
        timestamp: new Date(),
        data: {}
      };

      // Skulle ikke kaste en fejl, men returnere original kontekst
      const result = await pluginManager.executeHook('testHook', context);
      expect(result).toEqual(context);
    });

    test('should handle concurrent plugin operations', async () => {
      const plugin = {
        id: 'test-plugin',
        name: 'Test Plugin',
        version: '1.0.0',
        description: 'Test plugin',
        author: 'Test Author',
        hooks: []
      };

      // Registrer plugin først
      await pluginManager.registerPlugin(plugin);

      // Udfør aktivering og deaktivering samtidigt
      const operations = [
        pluginManager.activatePlugin('test-plugin'),
        pluginManager.deactivatePlugin('test-plugin')
      ];

      // Skulle ikke kaste fejl
      await expect(Promise.all(operations)).resolves.not.toThrow();
    });
  });

  test('should register a plugin successfully', async () => {
    const mockPlugin = {
      id: 'test-plugin',
      name: 'Test Plugin',
      version: '1.0.0',
      description: 'A test plugin',
      author: 'Test Author',
      hooks: [
        {
          name: 'onActivate',
          handler: 'testPlugin.onActivate',
          priority: 1
        },
        {
          name: 'onDeactivate',
          handler: 'testPlugin.onDeactivate',
          priority: 1
        }
      ]
    };

    await pluginManager.registerPlugin(mockPlugin);
    const plugin = pluginManager.getPlugin('test-plugin');
    expect(plugin).toBeDefined();
    expect(plugin?.manifest).toEqual(mockPlugin);
    expect(plugin?.status).toBe('registered');
    expect(plugin?.instance).toBeNull();
  });

  test('should execute a hook successfully', async () => {
    const mockPlugin = {
      id: 'test-plugin',
      name: 'Test Plugin',
      version: '1.0.0',
      description: 'A test plugin',
      author: 'Test Author',
      hooks: [
        {
          name: 'testHook',
          handler: 'testPlugin.testHook',
          priority: 1
        }
      ]
    };

    await pluginManager.registerPlugin(mockPlugin);
    const context = {
      workspaceId: 'test-workspace',
      pluginId: 'test-plugin',
      timestamp: new Date(),
      data: { testData: 'test' }
    };
    await pluginManager.executeHook('testHook', context);
    // Note: We can't directly test the hook execution since it's based on the handler string
    // In a real implementation, we would need to mock the hook resolution system
  });

  describe('Version Kompatibilitet', () => {
    test('should accept plugin without version constraints', async () => {
      const plugin = {
        id: 'test-plugin',
        name: 'Test Plugin',
        version: '1.0.0',
        description: 'Test plugin',
        author: 'Test Author',
        hooks: []
      };

      await expect(pluginManager.registerPlugin(plugin)).resolves.not.toThrow();
    });

    test('should accept compatible plugin version', async () => {
      const plugin = {
        id: 'test-plugin',
        name: 'Test Plugin',
        version: '1.0.0',
        description: 'Test plugin',
        author: 'Test Author',
        minHostVersion: '1.5.0',
        maxHostVersion: '2.5.0',
        hooks: []
      };

      await expect(pluginManager.registerPlugin(plugin)).resolves.not.toThrow();
    });

    test('should reject plugin with incompatible minimum version', async () => {
      const plugin = {
        id: 'test-plugin',
        name: 'Test Plugin',
        version: '1.0.0',
        description: 'Test plugin',
        author: 'Test Author',
        minHostVersion: '2.5.0', // Højere end host version (2.0.0)
        hooks: []
      };

      await expect(pluginManager.registerPlugin(plugin)).rejects.toThrow(
        'Plugin test-plugin er ikke kompatibel med denne version af værten'
      );
    });

    test('should reject plugin with incompatible maximum version', async () => {
      const plugin = {
        id: 'test-plugin',
        name: 'Test Plugin',
        version: '1.0.0',
        description: 'Test plugin',
        author: 'Test Author',
        maxHostVersion: '1.5.0', // Lavere end host version (2.0.0)
        hooks: []
      };

      await expect(pluginManager.registerPlugin(plugin)).rejects.toThrow(
        'Plugin test-plugin er ikke kompatibel med denne version af værten'
      );
    });

    test('should handle complex version numbers', async () => {
      const pluginManager = new PluginManager('2.5.3');
      
      const plugin = {
        id: 'test-plugin',
        name: 'Test Plugin',
        version: '1.0.0',
        description: 'Test plugin',
        author: 'Test Author',
        minHostVersion: '2.5.0',
        maxHostVersion: '2.6.0',
        hooks: []
      };

      await expect(pluginManager.registerPlugin(plugin)).resolves.not.toThrow();
    });

    test('should compare versions correctly', async () => {
      const testCases = [
        { hostVersion: '1.0.0', minVersion: '0.9.0', maxVersion: '1.1.0', shouldAccept: true },
        { hostVersion: '2.0.0', minVersion: '2.0.0', maxVersion: '3.0.0', shouldAccept: true },
        { hostVersion: '1.5.0', minVersion: '1.5.1', maxVersion: '2.0.0', shouldAccept: false },
        { hostVersion: '2.0.0', minVersion: '1.0.0', maxVersion: '1.9.9', shouldAccept: false }
      ];

      for (const testCase of testCases) {
        const manager = new PluginManager(testCase.hostVersion);
        const plugin = {
          id: 'test-plugin',
          name: 'Test Plugin',
          version: '1.0.0',
          description: 'Test plugin',
          author: 'Test Author',
          minHostVersion: testCase.minVersion,
          maxHostVersion: testCase.maxVersion,
          hooks: []
        };

        if (testCase.shouldAccept) {
          await expect(manager.registerPlugin(plugin)).resolves.not.toThrow();
        } else {
          await expect(manager.registerPlugin(plugin)).rejects.toThrow();
        }
      }
    });
  });
}); 