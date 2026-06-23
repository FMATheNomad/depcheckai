import { ManifestParser } from '../src/scanners/manifest.js';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const FIXTURES = join(__dirname, 'fixtures');

describe('ManifestParser', () => {
  const parser = new ManifestParser();

  describe('detect', () => {
    it('should detect package.json', () => {
      const manifests = parser.detect(FIXTURES);
      const pkgJson = manifests.find(m => m.path.endsWith('package.json'));
      expect(pkgJson).toBeDefined();
      expect(pkgJson!.ecosystem).toBe('npm');
    });

    it('should detect requirements.txt', () => {
      const manifests = parser.detect(FIXTURES);
      const reqTxt = manifests.find(m => m.path.endsWith('requirements.txt'));
      expect(reqTxt).toBeDefined();
      expect(reqTxt!.ecosystem).toBe('pypi');
    });

    it('should detect Cargo.toml', () => {
      const manifests = parser.detect(FIXTURES);
      const cargo = manifests.find(m => m.path.endsWith('Cargo.toml'));
      expect(cargo).toBeDefined();
      expect(cargo!.ecosystem).toBe('crates');
    });
  });

  describe('parse package.json', () => {
    it('should parse dependencies and devDependencies', () => {
      const deps = parser.parse(join(FIXTURES, 'package.json'));
      const names = deps.map(d => d.name);
      expect(names).toContain('express');
      expect(names).toContain('lodash');
      expect(names).toContain('typescript');
      expect(names).toContain('jest');
      expect(deps.every(d => d.ecosystem === 'npm')).toBe(true);
    });

    it('should strip semver prefixes', () => {
      const deps = parser.parse(join(FIXTURES, 'package.json'));
      const express = deps.find(d => d.name === 'express');
      expect(express).toBeDefined();
      expect(express!.version).toBe('4.18.2');
    });
  });

  describe('parse requirements.txt', () => {
    it('should parse Python dependencies', () => {
      const deps = parser.parse(join(FIXTURES, 'requirements.txt'));
      const names = deps.map(d => d.name);
      expect(names).toContain('flask');
      expect(names).toContain('django');
      expect(names).toContain('requests');
      expect(names).toContain('numpy');
      expect(deps.every(d => d.ecosystem === 'pypi')).toBe(true);
    });

    it('should skip comments and options', () => {
      const deps = parser.parse(join(FIXTURES, 'requirements.txt'));
      expect(deps.find(d => d.name.startsWith('#'))).toBeUndefined();
    });
  });

  describe('parse Cargo.toml', () => {
    it('should parse Rust dependencies', () => {
      const deps = parser.parse(join(FIXTURES, 'Cargo.toml'));
      const names = deps.map(d => d.name);
      expect(names).toContain('serde');
      expect(names).toContain('tokio');
      expect(names).toContain('reqwest');
      expect(names).toContain('clap');
      expect(deps.every(d => d.ecosystem === 'crates')).toBe(true);
    });

    it('should parse table-format dependencies', () => {
      const deps = parser.parse(join(FIXTURES, 'Cargo.toml'));
      const tokio = deps.find(d => d.name === 'tokio');
      expect(tokio).toBeDefined();
      expect(tokio!.version).toBe('1.35');
    });
  });
});
