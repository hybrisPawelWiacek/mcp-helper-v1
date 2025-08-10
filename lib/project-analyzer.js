/**
 * Project Analyzer for MCP Helper
 * Detects project type, technology stack, and recommends appropriate MCP servers
 */

import fs from 'fs-extra';
import path from 'path';

export class ProjectAnalyzer {
  constructor() {
    this.projectPath = process.cwd();
    this.analysis = null;
    
    // Define technology patterns and their indicators
    this.techPatterns = {
      // Languages
      javascript: {
        files: ['package.json', '*.js', '*.mjs', '*.cjs'],
        dependencies: [],
        recommendedServers: ['github-official', 'serena', 'context7']
      },
      typescript: {
        files: ['tsconfig.json', '*.ts', '*.tsx'],
        dependencies: ['typescript'],
        recommendedServers: ['github-official', 'serena', 'context7']
      },
      python: {
        files: ['requirements.txt', 'pyproject.toml', 'setup.py', '*.py', 'Pipfile'],
        dependencies: [],
        recommendedServers: ['github-official', 'serena', 'context7']
      },
      go: {
        files: ['go.mod', 'go.sum', '*.go'],
        dependencies: [],
        recommendedServers: ['github-official', 'serena']
      },
      rust: {
        files: ['Cargo.toml', 'Cargo.lock', '*.rs'],
        dependencies: [],
        recommendedServers: ['github-official', 'serena']
      },
      java: {
        files: ['pom.xml', 'build.gradle', '*.java'],
        dependencies: [],
        recommendedServers: ['github-official', 'serena']
      },
      
      // Frameworks
      react: {
        files: ['*.jsx', '*.tsx'],
        dependencies: ['react', 'react-dom'],
        recommendedServers: ['context7', 'firecrawl', 'brave-search']
      },
      vue: {
        files: ['*.vue'],
        dependencies: ['vue'],
        recommendedServers: ['context7', 'firecrawl']
      },
      angular: {
        files: ['angular.json'],
        dependencies: ['@angular/core'],
        recommendedServers: ['context7', 'firecrawl']
      },
      nextjs: {
        files: ['next.config.js', 'next.config.mjs'],
        dependencies: ['next'],
        recommendedServers: ['context7', 'firecrawl', 'puppeteer']
      },
      express: {
        files: [],
        dependencies: ['express'],
        recommendedServers: ['postgres', 'sequentialthinking']
      },
      django: {
        files: ['manage.py'],
        dependencies: ['django'],
        recommendedServers: ['postgres', 'sequentialthinking']
      },
      flask: {
        files: [],
        dependencies: ['flask'],
        recommendedServers: ['postgres']
      },
      
      // Tools & Services
      docker: {
        files: ['Dockerfile', 'docker-compose.yml', 'docker-compose.yaml'],
        dependencies: [],
        recommendedServers: ['docker-mcp-toolkit']
      },
      kubernetes: {
        files: ['*.yaml', '*.yml'],
        patterns: ['kind: Deployment', 'kind: Service'],
        recommendedServers: ['docker-mcp-toolkit']
      },
      terraform: {
        files: ['*.tf', '*.tfvars'],
        dependencies: [],
        recommendedServers: ['github-official']
      },
      
      // Testing
      jest: {
        files: ['jest.config.js', 'jest.config.ts'],
        dependencies: ['jest'],
        recommendedServers: ['puppeteer', 'playwright']
      },
      cypress: {
        files: ['cypress.json', 'cypress.config.js'],
        dependencies: ['cypress'],
        recommendedServers: ['puppeteer', 'playwright']
      },
      
      // Documentation
      markdown: {
        files: ['*.md', 'README.md', 'CONTRIBUTING.md'],
        dependencies: [],
        recommendedServers: ['github-official', 'notion']
      },
      
      // Databases
      mongodb: {
        files: [],
        dependencies: ['mongodb', 'mongoose'],
        recommendedServers: ['memory']
      },
      postgresql: {
        files: [],
        dependencies: ['pg', 'sequelize', 'typeorm', 'psycopg2'],
        recommendedServers: ['postgres']
      },
      
      // CI/CD
      githubActions: {
        files: ['.github/workflows/*.yml', '.github/workflows/*.yaml'],
        dependencies: [],
        recommendedServers: ['github-official']
      },
      
      // Project Management
      jira: {
        files: ['.jira'],
        dependencies: [],
        recommendedServers: ['atlassian']
      }
    };
    
    // Define project type patterns
    this.projectTypes = {
      webApp: {
        indicators: ['react', 'vue', 'angular', 'nextjs'],
        description: 'Web Application',
        recommendedServers: ['puppeteer', 'playwright', 'firecrawl']
      },
      api: {
        indicators: ['express', 'django', 'flask', 'fastapi'],
        description: 'API/Backend Service',
        recommendedServers: ['postgres', 'brave-search']
      },
      cli: {
        indicators: ['commander', 'yargs', 'click', 'cobra'],
        description: 'Command Line Tool',
        recommendedServers: ['sequentialthinking']
      },
      library: {
        indicators: ['tsconfig.json', 'setup.py', 'Cargo.toml'],
        description: 'Library/Package',
        recommendedServers: ['context7', 'github-official']
      },
      documentation: {
        indicators: ['markdown', 'docusaurus', 'mkdocs'],
        description: 'Documentation Project',
        recommendedServers: ['notion', 'firecrawl']
      },
      dataScience: {
        indicators: ['jupyter', 'pandas', 'numpy', 'scikit-learn'],
        description: 'Data Science/ML Project',
        recommendedServers: ['memory', 'sequentialthinking']
      },
      mobile: {
        indicators: ['react-native', 'flutter', 'ionic'],
        description: 'Mobile Application',
        recommendedServers: ['context7', 'github-official']
      },
      infrastructure: {
        indicators: ['docker', 'kubernetes', 'terraform'],
        description: 'Infrastructure/DevOps',
        recommendedServers: ['docker-mcp-toolkit']
      }
    };
  }

  /**
   * Analyze the current project
   */
  async analyze(projectPath = this.projectPath) {
    const detected = {
      path: projectPath,
      technologies: [],
      projectType: null,
      hasPackageJson: false,
      hasPipfile: false,
      hasGoMod: false,
      hasCargoToml: false,
      hasPomXml: false,
      hasDockerfile: false,
      hasGitRepo: false,
      dependencies: [],
      devDependencies: [],
      recommendedServers: new Set(),
      confidence: 0
    };
    
    // Check for version control
    detected.hasGitRepo = await fs.pathExists(path.join(projectPath, '.git'));
    if (detected.hasGitRepo) {
      detected.recommendedServers.add('github-official');
    }
    
    // Check for package.json (Node.js)
    const packageJsonPath = path.join(projectPath, 'package.json');
    if (await fs.pathExists(packageJsonPath)) {
      detected.hasPackageJson = true;
      detected.technologies.push('javascript');
      
      try {
        const packageJson = await fs.readJson(packageJsonPath);
        detected.dependencies = Object.keys(packageJson.dependencies || {});
        detected.devDependencies = Object.keys(packageJson.devDependencies || {});
        
        // Check for specific frameworks
        const allDeps = [...detected.dependencies, ...detected.devDependencies];
        for (const [tech, config] of Object.entries(this.techPatterns)) {
          if (config.dependencies?.some(dep => allDeps.includes(dep))) {
            detected.technologies.push(tech);
            config.recommendedServers?.forEach(s => detected.recommendedServers.add(s));
          }
        }
      } catch (error) {
        console.error('Error reading package.json:', error);
      }
    }
    
    // Check for requirements.txt (Python)
    const requirementsPath = path.join(projectPath, 'requirements.txt');
    if (await fs.pathExists(requirementsPath)) {
      detected.hasPipfile = true;
      detected.technologies.push('python');
      
      try {
        const requirements = await fs.readFile(requirementsPath, 'utf-8');
        const deps = requirements.split('\n').filter(line => line && !line.startsWith('#'));
        
        // Check for specific Python frameworks
        if (deps.some(d => d.includes('django'))) detected.technologies.push('django');
        if (deps.some(d => d.includes('flask'))) detected.technologies.push('flask');
        if (deps.some(d => d.includes('fastapi'))) detected.technologies.push('fastapi');
        if (deps.some(d => d.includes('pandas'))) detected.technologies.push('dataScience');
      } catch (error) {
        console.error('Error reading requirements.txt:', error);
      }
    }
    
    // Check for go.mod (Go)
    if (await fs.pathExists(path.join(projectPath, 'go.mod'))) {
      detected.hasGoMod = true;
      detected.technologies.push('go');
    }
    
    // Check for Cargo.toml (Rust)
    if (await fs.pathExists(path.join(projectPath, 'Cargo.toml'))) {
      detected.hasCargoToml = true;
      detected.technologies.push('rust');
    }
    
    // Check for pom.xml (Java/Maven)
    if (await fs.pathExists(path.join(projectPath, 'pom.xml'))) {
      detected.hasPomXml = true;
      detected.technologies.push('java');
    }
    
    // Check for Dockerfile
    if (await fs.pathExists(path.join(projectPath, 'Dockerfile'))) {
      detected.hasDockerfile = true;
      detected.technologies.push('docker');
      detected.recommendedServers.add('docker-mcp-toolkit');
    }
    
    // Check for TypeScript
    if (await fs.pathExists(path.join(projectPath, 'tsconfig.json'))) {
      detected.technologies.push('typescript');
    }
    
    // Determine project type
    detected.projectType = await this.determineProjectType(detected);
    
    // Add project type recommended servers
    if (detected.projectType && this.projectTypes[detected.projectType]) {
      const projectTypeConfig = this.projectTypes[detected.projectType];
      projectTypeConfig.recommendedServers?.forEach(s => detected.recommendedServers.add(s));
    }
    
    // Calculate confidence score
    detected.confidence = this.calculateConfidence(detected);
    
    // Always recommend core servers
    ['serena', 'sequentialthinking', 'memory'].forEach(s => detected.recommendedServers.add(s));
    
    this.analysis = detected;
    return detected;
  }

  /**
   * Determine the project type based on detected technologies
   */
  async determineProjectType(analysis) {
    const scores = {};
    
    for (const [type, config] of Object.entries(this.projectTypes)) {
      scores[type] = 0;
      
      // Check for indicator technologies
      for (const indicator of config.indicators) {
        if (analysis.technologies.includes(indicator)) {
          scores[type] += 2;
        }
        if (analysis.dependencies.includes(indicator)) {
          scores[type] += 1;
        }
      }
    }
    
    // Find the highest scoring type
    let maxScore = 0;
    let projectType = 'generic';
    
    for (const [type, score] of Object.entries(scores)) {
      if (score > maxScore) {
        maxScore = score;
        projectType = type;
      }
    }
    
    return projectType;
  }

  /**
   * Calculate confidence score for the analysis
   */
  calculateConfidence(analysis) {
    let score = 0;
    
    // Base scores for file presence
    if (analysis.hasPackageJson) score += 20;
    if (analysis.hasPipfile) score += 20;
    if (analysis.hasGoMod) score += 20;
    if (analysis.hasCargoToml) score += 20;
    if (analysis.hasGitRepo) score += 10;
    if (analysis.hasDockerfile) score += 10;
    
    // Score for detected technologies
    score += Math.min(analysis.technologies.length * 5, 30);
    
    // Score for dependencies
    score += Math.min(analysis.dependencies.length * 2, 20);
    
    // Score for identified project type
    if (analysis.projectType && analysis.projectType !== 'generic') {
      score += 20;
    }
    
    return Math.min(score, 100);
  }

  /**
   * Get server recommendations based on analysis
   */
  getRecommendations() {
    if (!this.analysis) {
      return {
        essential: ['serena', 'sequentialthinking', 'memory'],
        recommended: ['github-official', 'context7'],
        optional: []
      };
    }
    
    const allServers = Array.from(this.analysis.recommendedServers);
    
    return {
      essential: ['serena', 'sequentialthinking', 'memory'],
      recommended: allServers.filter(s => !['serena', 'sequentialthinking', 'memory'].includes(s)),
      optional: this.getOptionalServers(this.analysis)
    };
  }

  /**
   * Get optional servers based on project characteristics
   */
  getOptionalServers(analysis) {
    const optional = [];
    
    // Suggest Slack for team projects
    if (analysis.hasGitRepo) {
      optional.push('slack');
    }
    
    // Suggest Notion for documentation-heavy projects
    if (analysis.technologies.includes('markdown')) {
      optional.push('notion');
    }
    
    // Suggest Atlassian for enterprise projects
    if (analysis.projectType === 'api' || analysis.projectType === 'webApp') {
      optional.push('atlassian');
    }
    
    return optional;
  }

  /**
   * Get a human-readable summary of the analysis
   */
  getSummary() {
    if (!this.analysis) {
      return 'No analysis available. Run analyze() first.';
    }
    
    const { technologies, projectType, confidence, recommendedServers } = this.analysis;
    const projectTypeDesc = this.projectTypes[projectType]?.description || 'Generic Project';
    
    return {
      projectType: projectTypeDesc,
      mainTechnologies: technologies.slice(0, 5),
      confidence: `${confidence}%`,
      recommendedServers: Array.from(recommendedServers),
      summary: `Detected ${projectTypeDesc} using ${technologies.slice(0, 3).join(', ')}${technologies.length > 3 ? ` and ${technologies.length - 3} more` : ''}`
    };
  }

  /**
   * Check for existing MCP configuration
   */
  async checkExistingConfig() {
    const claudeJsonPath = path.join(process.env.HOME || process.env.USERPROFILE, '.claude.json');
    const hasGlobalConfig = await fs.pathExists(claudeJsonPath);
    
    const localEnvPath = path.join(this.projectPath, '.env');
    const hasLocalEnv = await fs.pathExists(localEnvPath);
    
    return {
      hasGlobalConfig,
      hasLocalEnv,
      claudeJsonPath,
      localEnvPath
    };
  }
}

export default ProjectAnalyzer;