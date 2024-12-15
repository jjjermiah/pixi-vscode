import * as assert from 'assert';
import { EnvFeatureTaskList, Feature, TaskInfo, PixiInfo, EnvironmentsInfo, GlobalInfo, ProjectInfo } from '../../types';

// src/types.test.ts


suite('Types Test Suite', () => {
  test('EnvFeatureTaskList structure', () => {
    const envFeatureTaskList: EnvFeatureTaskList = {
      environment: 'development',
      features: [
        {
          name: 'feature1',
          tasks: [
            {
              name: 'task1',
              cmd: 'echo "Hello World"',
              description: 'A sample task',
              depends_on: [],
              cwd: null,
              env: null,
              clean_env: true,
              inputs: null,
              outputs: null
            }
          ]
        }
      ]
    };

    assert.strictEqual(envFeatureTaskList.environment, 'development');
    assert.strictEqual(envFeatureTaskList.features.length, 1);
    assert.strictEqual(envFeatureTaskList.features[0].name, 'feature1');
    assert.strictEqual(envFeatureTaskList.features[0].tasks.length, 1);
    assert.strictEqual(envFeatureTaskList.features[0].tasks[0].name, 'task1');
  });

  test('PixiInfo structure', () => {
    const pixiInfo: PixiInfo = {
      platform: 'linux',
      virtual_packages: ['package1'],
      version: '1.0.0',
      cache_dir: '/cache',
      cache_size: null,
      auth_dir: '/auth',
      global_info: {
        bin_dir: '/bin',
        env_dir: '/env',
        manifest: 'manifest.json'
      },
      project_info: {
        name: 'project1',
        manifest_path: '/manifest',
        last_updated: null,
        pixi_folder_size: null,
        version: '1.0.0'
      },
      environments_info: [
        {
          name: 'env1',
          features: ['feature1'],
          solve_group: null,
          environment_size: null,
          dependencies: [],
          pypi_dependencies: [],
          platforms: ['linux'],
          tasks: [],
          channels: [],
          prefix: '/prefix'
        }
      ],
      config_locations: ['/config']
    };

    assert.strictEqual(pixiInfo.platform, 'linux');
    assert.strictEqual(pixiInfo.virtual_packages.length, 1);
    assert.strictEqual(pixiInfo.version, '1.0.0');
    assert.strictEqual(pixiInfo.cache_dir, '/cache');
    assert.strictEqual(pixiInfo.auth_dir, '/auth');
    assert.strictEqual(pixiInfo.global_info.bin_dir, '/bin');
    assert.strictEqual(pixiInfo.project_info.name, 'project1');
    assert.strictEqual(pixiInfo.environments_info.length, 1);
    assert.strictEqual(pixiInfo.config_locations.length, 1);
  });

  test('GlobalInfo structure', () => {
    const globalInfo: GlobalInfo = {
      bin_dir: '/bin',
      env_dir: '/env',
      manifest: 'manifest.json'
    };

    assert.strictEqual(globalInfo.bin_dir, '/bin');
    assert.strictEqual(globalInfo.env_dir, '/env');
    assert.strictEqual(globalInfo.manifest, 'manifest.json');
  });

  test('ProjectInfo structure', () => {
    const projectInfo: ProjectInfo = {
      name: 'project1',
      manifest_path: '/manifest',
      last_updated: null,
      pixi_folder_size: null,
      version: '1.0.0'
    };

    assert.strictEqual(projectInfo.name, 'project1');
    assert.strictEqual(projectInfo.manifest_path, '/manifest');
    assert.strictEqual(projectInfo.version, '1.0.0');
  });

  test('EnvironmentsInfo structure', () => {
    const environmentsInfo: EnvironmentsInfo = {
      name: 'env1',
      features: ['feature1'],
      solve_group: null,
      environment_size: null,
      dependencies: [],
      pypi_dependencies: [],
      platforms: ['linux'],
      tasks: [],
      channels: [],
      prefix: '/prefix'
    };

    assert.strictEqual(environmentsInfo.name, 'env1');
    assert.strictEqual(environmentsInfo.features.length, 1);
    assert.strictEqual(environmentsInfo.platforms.length, 1);
    assert.strictEqual(environmentsInfo.prefix, '/prefix');
  });
});