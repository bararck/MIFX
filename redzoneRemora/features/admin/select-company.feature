@api @auth @admin @smoke @serial
Feature: Admin selects an active company
  As a Super User
  I want to select a company context
  So that subsequent API requests operate on the intended company

  Rule: Only the configured company may become the active context

  Scenario: Select the configured company returned by search
    Given I authenticate to Remora as the configured API user
    When I search companies using the configured company name
    Then the configured company is returned by the search
    When I select the configured company
    Then the company selection response is successful
    And the active company context is available for subsequent requests
