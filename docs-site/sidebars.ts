import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';
import apiSidebar from './docs/api/sidebar';

const sidebars: SidebarsConfig = {
  docsSidebar: [
    'index',
    {
      type: 'category',
      label: 'Getting Started',
      items: [
        'getting-started/requirements',
        'getting-started/install-docker',
        'getting-started/install-manual',
        'getting-started/environment-variables',
        'getting-started/vyos-http-api',
        'getting-started/first-run',
      ],
    },
    {
      type: 'category',
      label: 'Architecture',
      items: [
        'architecture/overview',
        'architecture/vyos-communication',
        'architecture/sessions-and-auth',
        'architecture/rbac',
        'architecture/multi-site',
      ],
    },
    {
      type: 'category',
      label: 'User Guide',
      items: [
        'user-guide/dashboard',
        'user-guide/network',
        'user-guide/firewall',
        'user-guide/routing',
        'user-guide/policies',
        'user-guide/vpn',
        'user-guide/services',
        'user-guide/load-balancing',
        'user-guide/monitoring',
        'user-guide/sites',
        'user-guide/system',
        'user-guide/pki',
        'user-guide/settings',
      ],
    },
    {
      type: 'category',
      label: 'Reference',
      items: [
        'reference/authentication',
        'reference/errors',
        'reference/conventions',
        'reference/commit-confirm',
        {
          type: 'link',
          label: 'API reference',
          href: '/api/',
        },
      ],
    },
    {
      type: 'category',
      label: 'Operations',
      items: [
        'operations/backups',
        'operations/upgrades',
        'operations/reverse-proxy',
        'operations/troubleshooting',
      ],
    },
    {
      type: 'category',
      label: 'Contributing',
      items: [
        'contributing/dev-setup',
        'contributing/tests',
        'contributing/api-reference-generation',
      ],
    },
  ],
  apiSidebar: ['api/index', ...apiSidebar],
};

export default sidebars;
