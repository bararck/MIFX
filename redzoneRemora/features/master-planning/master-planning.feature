@api @master-planning @regression @dynamic @serial
Feature: Master Planning dashboard integrity
  As an operations user
  I want dashboard analytics and master planning results to agree
  So that operational decisions are based on consistent data

  Background:
    Given I am authenticated in the configured company context

  Rule: Dashboard totals match the master planning source

    Scenario: Analytic totals plus On Track agree with master planning pagination
      When I retrieve the Master Planning dashboard analytics
      And I retrieve the first master planning page
      Then the master planning pagination is valid
      When I retrieve master planning filtered by the "On Track" status
      Then the returned On Track records have the On Track status
      And the master planning total equals the analytic status total plus On Track

  Rule: A filter only returns records compatible with the selected value

    Scenario Outline: A single Master Planning filter returns matching records
      Given I select a compatible "<filter>" Master Planning filter value
      When I retrieve master planning using the selected filters
      Then every returned record matches the selected filters

      Examples:
        | filter    |
        | rank      |
        | vessel    |
        | status    |
        | recruiter |

    Scenario: A compatible pair of Master Planning filters returns matching records
      Given I select a compatible pair of Master Planning filter values
      When I retrieve master planning using the selected filters
      Then every returned record matches the selected filters

    Scenario: A compatible set of Master Planning filters returns matching records
      Given I select a compatible set of all Master Planning filter values
      When I retrieve master planning using the selected filters
      Then every returned record matches the selected filters

  Rule: Search and contract data preserve master planning meaning

    Scenario: Search by an available crew name returns matching master planning records
      Given I select a crew name from available master planning records
      When I search master planning for the selected crew name
      Then every returned record contains the selected crew name

    @contract @data-dependent
    Scenario: Master Planning crew record agrees with its vessel-rank detail
      Given I select a Master Planning crew record with a compatible vessel-rank detail
      When I retrieve the selected Master Planning vessel-rank detail
      Then the vessel-rank detail should match the selected Master Planning crew record

    @contract @data-dependent
    Scenario: Master planning movement agrees with the active contract actual timeline
      Given I identify a crew with an active contract and compatible master planning movement
      When I retrieve the selected crew active contract timeline
      Then the master planning movement agrees with the active contract actual timeline

  Rule: Crew contracts and relievers determine planning status

    @stateful @destructive @data-dependent
    Scenario: An expired or near-expired onboard crew becomes confirmed when a new crew is planned, then restores after revert
      Given I select an eligible expired or near-expired onboard crew replacement opportunity
      When I add a New Crew candidate as nominee for the selected rank
      And I proceed the selected nominee to Planned
      Then the original onboard crew planning status becomes Confirmed with the selected New Crew as reliever
      When I revert the selected Planned crew
      Then the original onboard crew planning status is restored

    Scenario: Confirmed planning records have valid relievers
      Given confirmed planning records are available in Master Planning
      Then every confirmed planning record should have a valid reliever

    Scenario: Vacant planning records have no active crew assignment
      Given vacant planning records are available in Master Planning
      Then every vacant planning record should have no active crew assignment

    Scenario: Planning status follows the active contract and reliever
      Given Master Planning status records are available for contract validation
      Then planning status should match the active contract and reliever rules

    Scenario: Planning dates and elapsed contract duration follow the active contract
      Given active planning contracts are available for date validation
      Then planning dates and contract duration should match the active contract

    Scenario: Each Master Planning status uses active-contract dates and duration
      Given a compatible planning record is available for each Master Planning status
      Then each planning status should match its active contract and reliever rules
      And planning dates and contract duration should match the active contract

    Scenario: Master Planning summary matches detailed planning statuses
      Given Master Planning summary detail records are available
      Then the Master Planning summary should match the detailed planning statuses
