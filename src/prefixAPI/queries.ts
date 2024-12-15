const gql = require("@apollo/client").gql;

// Now you can use gql in your queries

export const GET_PACKAGE_LATEST_VERSION = gql`
	query GetPackageLatestVersion(
		$channelName: String!
		$packageName: String!
	) {
		package(channelName: $channelName, name: $packageName) {
			latestVersion {
				version
			}
		}
	}
`;

export const FIND_PACKAGES = gql`
	query findPackages($packageName: String!, $limit: Int = 20) {
		packages(
			limit: $limit
			orderBy: { bySimilarity: { field: NAME, matches: $packageName } }
		) {
			page {
				name
				summary
				latestVersion {
					version
				}
				channel {
					name
				}
			}
		}
	}
`;

export const GET_USER_CHANNELS = gql`
	query GetUserChannels($page: Int) {
		channels(page: $page) {
			pages
			page {
				name
				description
				baseUrl
				owner
			}
		}
	}
`;

// gql`
// 	{
// 		channels {
// 			pages
// 			current
// 			page {
// 				name
// 				description
// 			}
// 		}
// 	}
// `;