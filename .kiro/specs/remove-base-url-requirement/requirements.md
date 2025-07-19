# Requirements Document

## Introduction

Currently, users must configure `SPOOL_BASE_URL` in their environment variables to point to where their Spool CMS instance is running. Since Spool CMS is always deployed at `spoolcms.com`, this creates unnecessary configuration complexity. We should simplify the integration by automatically using the production Spool URL and remove the base URL requirement from the integration guide and package.

## Requirements

### Requirement 1

**User Story:** As a developer integrating Spool CMS, I want to only need to configure my API key and Site ID, so that I have fewer configuration steps and less chance for errors.

#### Acceptance Criteria

1. WHEN a developer installs @spoolcms/nextjs THEN they should only need to configure SPOOL_API_KEY and SPOOL_SITE_ID
2. WHEN the package makes API requests THEN it should automatically use https://spoolcms.com as the base URL
3. WHEN a developer follows the integration guide THEN there should be no mention of SPOOL_BASE_URL configuration
4. WHEN existing integrations are updated THEN they should continue to work even if SPOOL_BASE_URL is still configured (backward compatibility)

### Requirement 2

**User Story:** As a developer, I want the integration guide to be as simple as possible, so that I can get started quickly without confusion.

#### Acceptance Criteria

1. WHEN a developer reads the integration guide THEN the environment variables section should only show SPOOL_API_KEY and SPOOL_SITE_ID as required
2. WHEN a developer follows the setup steps THEN they should be able to complete integration with just 2 environment variables
3. WHEN the guide shows example .env.local files THEN SPOOL_BASE_URL should not be present
4. WHEN developers need the site URL for SEO THEN only NEXT_PUBLIC_SITE_URL should be mentioned (for their own site, not Spool's)

### Requirement 3

**User Story:** As a developer with an existing Spool integration, I want my current setup to continue working, so that I don't have breaking changes when updating the package.

#### Acceptance Criteria

1. WHEN a developer has SPOOL_BASE_URL configured in their existing setup THEN the package should still respect that setting for backward compatibility
2. WHEN SPOOL_BASE_URL is not configured THEN the package should default to https://spoolcms.com
3. WHEN a developer updates to the new package version THEN their existing integration should work without changes
4. WHEN both SPOOL_BASE_URL and the default are available THEN SPOOL_BASE_URL should take precedence (for custom deployments if needed)

### Requirement 4

**User Story:** As a developer, I want clear documentation about the simplified setup, so that I understand what changed and how to use the new streamlined configuration.

#### Acceptance Criteria

1. WHEN the integration guide is updated THEN it should clearly show the simplified environment variable setup
2. WHEN developers look at code examples THEN the spoolConfig should only require apiKey and siteId
3. WHEN the package documentation is updated THEN it should reflect the new simplified configuration
4. WHEN developers need to troubleshoot THEN the guide should mention that SPOOL_BASE_URL is optional and defaults to spoolcms.com