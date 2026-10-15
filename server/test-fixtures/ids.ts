/**
 * Fixture user ids. DB suites pick the user ids they write for inside
 * 980000 to 999999 (the crowdpool suites sit at 986000 to 988999, older
 * suites at 999xxx), and the demo seed never does. CI runs the DB suites in
 * parallel on one database, so a read that must leave out other suites' rows
 * while they run can skip rows owned by a fixture id.
 *
 * The band is a convention for ids tests choose, not a guarantee about every
 * account: a suite that inserts a user with an explicit id moves the users
 * AUTO_INCREMENT counter, so on a long-lived scratch database a real sign-up
 * can land inside it. Pair the band with "has no users row" when skipping
 * rows a real account could own.
 *
 * Kept free of imports so raw mysql2 suites can use it without loading the
 * router or the database layer.
 */
export const FIXTURE_USER_ID_MIN = 980000;
export const FIXTURE_USER_ID_MAX = 999999;
