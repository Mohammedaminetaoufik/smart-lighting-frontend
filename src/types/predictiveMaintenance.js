// Shapes for the predictive-maintenance feature (JSDoc — the project is JSX, not TS).
// These document the data returned by predictiveMaintenanceService.

/**
 * @typedef {'critical'|'high'|'moderate'|'low'|'healthy'|'unknown'} RiskLevel
 * @typedef {'fresh'|'delayed'|'stale'|'obsolete'|'unavailable'} TelemetryFreshness
 */

/**
 * @typedef {Object} PredictiveSignal
 * @property {string} key
 * @property {string} label
 * @property {number} current_value
 * @property {number} [expected_value]
 * @property {string} [unit]
 * @property {number} [deviation_percent]
 * @property {number} [contribution_percent]
 * @property {'normal'|'warning'|'critical'} severity
 */

/**
 * @typedef {Object} PredictionItem
 * @property {number} id
 * @property {string} reference
 * @property {string} zone
 * @property {string} lcu_reference
 * @property {boolean} online
 * @property {string} fault_status
 * @property {string} predicted_label
 * @property {number} risk_score
 * @property {RiskLevel} risk_level
 * @property {number} confidence
 * @property {'rule_reliability'} [confidence_kind]
 * @property {number} eta_hours
 * @property {string} eta_label
 * @property {number} fault_count
 * @property {string|null} [last_fault_at]
 * @property {string|null} last_telemetry_at
 * @property {TelemetryFreshness} telemetry_freshness
 * @property {string} prediction_generated_at
 * @property {string} model_version
 * @property {number|null} work_order_id
 */

/**
 * @typedef {Object} PredictiveExplanation
 * @property {string} situation_summary
 * @property {string} risk_interpretation
 * @property {string} likely_scenario
 * @property {string} operational_impact
 * @property {string} decision
 * @property {Array<Object>} evidence
 * @property {Array<{order:number,action:string,why:string,urgency:string}>} preventive_plan
 * @property {string[]} verification_checklist
 * @property {string[]} limitations
 * @property {string} safety_notice
 * @property {'rule_based'|'llm_enriched'} source
 * @property {boolean} llm_available
 */

/**
 * @typedef {Object} PredictiveSummary
 * @property {number} total_lamp_posts
 * @property {number} at_risk_count
 * @property {number} critical_count
 * @property {number} high_risk_count
 * @property {number} moderate_risk_count
 * @property {number} healthy_count
 * @property {number} predicted_failures_30d
 * @property {number} average_model_confidence
 * @property {number} [average_rule_reliability]
 * @property {number} priority_interventions
 * @property {number} created_work_orders
 * @property {number} stale_telemetry_count
 * @property {number} missing_telemetry_count
 * @property {number} data_quality_score
 * @property {string} model_version
 * @property {'deterministic_threshold_rules'} [scoring_method]
 * @property {string} generated_at
 */

export {}
