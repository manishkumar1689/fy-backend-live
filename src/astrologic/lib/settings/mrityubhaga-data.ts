/* http://www.karmafriendly.com/2013/12/mrityu-bhaga-in-astrology.html */
/*
	1. the "orb" variable shows how much a planet degree can be away from the mrityubhaga degree
	2. The "sign array" can be used to add 360 sign position to each degree in array indicies in "degree array"
	3. The "graha" attribute indicated the 'planet'
	4. the "degree array" has 12 intigers, one fore each of the 12 signs
	5. There are two versions of Mrityubhaga, hence the "mrityu-1" and "mrityu-2" arrays. Both end with a source attribute to indicate source.
	
	Task: compare the Mrityuhabga degrees to each of the planet longitudes (using the orb).
	When the planet is within a orb range of a mrityubhaga then expose it.
*/
const mrityubhagaData = {
	orb: 1,
	mrityu: {
		standard: {
			values: [
				{
					graha: "as", degrees: [1, 9, 22, 22, 25, 2, 4, 23, 18, 20, 24, 10]
				},
				{ graha: "su", degrees: [20, 9, 12, 6, 8, 24, 16, 17, 22, 2, 3, 23] },
				{ graha: "mo", degrees: [8, 25, 22, 22, 21, 1, 4, 23, 18, 20, 20, 10] },
				{ graha: "ma", degrees: [19, 28, 25, 23, 29, 28, 14, 21, 2, 15, 11, 6] },
				{ graha: "me", degrees: [15, 14, 13, 12, 8, 18, 20, 10, 21, 22, 7, 5] },
				{ graha: "ju", degrees: [19, 29, 12, 27, 6, 4, 13, 10, 17, 11, 15, 28] },
				{ graha: "ve", degrees: [28, 15, 11, 17, 10, 13, 4, 6, 27, 12, 29, 19] },
				{ graha: "sa", degrees: [10, 4, 7, 9, 12, 16, 3, 18, 28, 14, 13, 15] },
				{ graha: "ra", degrees: [14, 13, 12, 11, 24, 23, 22, 21, 10, 20, 18, 8] },
				{ graha: "ke", degrees: [8, 18, 20, 10, 21, 22, 23, 24, 11, 12, 13, 14] },
				{ graha: "mn", degrees: [23, 24, 11, 12, 13, 14, 8, 18, 20, 10, 21, 22] },
			],
			source: "Mrityubhaga Degrees as per Jataka Parijata and Sarvartha Chintamani"
		},
		alternative: {
			values: [
				{ graha: "as", degrees: [1, 9, 22, 22, 25, 2, 4, 23, 18, 20, 24, 10] },
				{ graha: "su", degrees: [20, 9, 12, 6, 8, 24, 16, 17, 22, 2, 3, 23] },
				{ graha: "mo", degrees: [26, 12, 13, 25, 24, 11, 26, 14, 13, 25, 5, 12] },
				{ graha: "ma", degrees: [19, 28, 25, 23, 29, 28, 14, 21, 2, 15, 11, 6] },
				{ graha: "me", degrees: [15, 14, 13, 12, 8, 18, 20, 10, 21, 22, 7, 5] },
				{ graha: "ju", degrees: [19, 29, 12, 27, 6, 4, 13, 10, 17, 11, 15, 28] },
				{ graha: "ve", degrees: [28, 15, 11, 17, 10, 13, 4, 6, 27, 12, 29, 19] },
				{ graha: "sa", degrees: [10, 4, 7, 9, 12, 16, 3, 18, 28, 14, 13, 15] },
				{ graha: "ra", degrees: [14, 13, 12, 11, 24, 23, 22, 21, 10, 20, 18, 8] },
				{ graha: "ke", degrees: [8, 18, 20, 10, 21, 22, 23, 24, 11, 12, 13, 14] },
				{ graha: "mn", degrees: [23, 24, 11, 12, 13, 14, 8, 18, 20, 10, 21, 22] },

			],
			source: "Mrityu Bhaga Degree as per Phala Deepika and Hora Sara"
		}
	},
}

export default mrityubhagaData;