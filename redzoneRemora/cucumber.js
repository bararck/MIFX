const retry = Number.parseInt(process.env.CUCUMBER_RETRY ?? '0', 10);
const reportsEnabled = process.env.CUCUMBER_REPORTS !== 'false';
const format = ["progress"];

if (reportsEnabled) {
  format.push(
    "json:reports/cucumber-report.json",
    "html:reports/cucumber-report.html",
    "junit:reports/junit.xml"
  );
}

module.exports = {
  default: {
    requireModule: ["ts-node/register"],
    require: ["features/support/**/*.ts", "features/step-definitions/**/*.ts"],
    paths: ["features/**/*.feature"],
    format,
    formatOptions: { snippetInterface: "async-await" },
    // Selecting a company changes server-side account context. Keep the suite serial
    // until every worker has an isolated account and tenant.
    parallel: 1,
    // Retrying assertions masks flaky data and state. Opt in only for a known
    // transient infrastructure incident: CUCUMBER_RETRY=1.
    retry: Number.isSafeInteger(retry) && retry > 0 ? retry : 0
  }
};
