const boys = 500;
const girls = 500;

const profilesSeenPerDay = 100;
const likeRate = 0.25;

type Simulation = {
  userCount: number;
  profilesSeenPerDay: number;
  likeRate: number;
};

class User {
  id: number;
  gender: "girl" | "boy";
  profilesPerDay: number;
  likePercentage: number;
  likes: number;
  matches: number;
  swipes: number;
  usersLikeSent: (typeof User.prototype.id)[];
  usersLikeReceived: (typeof User.prototype.id)[];

  constructor(
    id: number,
    gender: "girl" | "boy",
    profilesPerDay: number,
    likePercentage: number,
    likes: number = 0,
    matches: number = 0,
    swipes: number = 0,
    usersLikeSent: [] = [],
    usersLikeReceived: [] = []
  ) {
    this.id = id;
    this.gender = gender;
    this.profilesPerDay = profilesPerDay;
    this.likePercentage = likePercentage;
    this.likes = likes;
    this.matches = matches;
    this.swipes = swipes;
    this.usersLikeSent = usersLikeSent;
    this.usersLikeReceived = usersLikeReceived;
  }

  swipe(otherUser: User) {
    this.swipes++;
    if (Math.random() > this.likePercentage) {
      return;
    }

    // this user just swiped like on the other user
    otherUser.likes++;
    otherUser.usersLikeReceived.push(this.id);
    this.usersLikeSent.push(otherUser.id);
    if (otherUser.usersLikeSent.includes(this.id)) {
      this.matches++;
      otherUser.matches++;
    }
  }

  alreadyMatched(otherUserId: number): boolean {
    return (
      this.usersLikeSent.includes(otherUserId) &&
      this.usersLikeReceived.includes(otherUserId)
    );
  }
}

type Stats = {
  likes: number;
  matches: number;
};

function stats(users: User[]): Stats {
  const totals = users.reduce(
    (acc, user) => {
      acc.likes += user.likes;
      acc.matches += user.matches;
      return acc;
    },
    { likes: 0, matches: 0 }
  );

  return {
    likes: totals.likes / users.length,
    matches: totals.matches / users.length,
  };
}

type AggregateStats = {
  boys: Stats;
  girls: Stats;
};

function simulate({
  boys,
  girls,
  days,
  reverse,
}: {
  boys: Simulation;
  girls: Simulation;
  days: number;
  reverse: boolean;
}): AggregateStats {
  // generate our user base
  const users: { boys: User[]; girls: User[] } = { boys: [], girls: [] };
  for (let i = 0; i < boys.userCount; i++) {
    users.boys.push(new User(i, "boy", boys.profilesSeenPerDay, boys.likeRate));
  }
  for (let i = 0; i < girls.userCount; i++) {
    users.girls.push(
      new User(
        i + users.boys.length,
        "girl",
        girls.profilesSeenPerDay,
        girls.likeRate
      )
    );
  }

  // simulate
  for (let i = 0; i < days; i++) {
    // console.time(`simulation:${days}:day:${i + 1}`);
    if (reverse) {
      runDay(users.boys, users.girls);
      runDay(users.girls, users.boys);
    } else {
      runDay(users.girls, users.boys);
      runDay(users.boys, users.girls);
    }
    // console.timeEnd(`simulation:${days}:day:${i + 1}`);
  }
  return {
    boys: stats(users.boys),
    girls: stats(users.girls),
  };
}

function runDay(theOnesSwiping: User[], availableMates: User[]) {
  let profileIdx = 0;
  // we pick available profiles to swipe by always taking the least swiped first
  availableMates = availableMates.sort(({ swipes: a }, { swipes: b }) => a - b);

  theOnesSwiping.forEach((mate) => {
    let swiped = 0;

    // start with those that have already swiped us (simulating the "liked you" tab)
    if (mate.usersLikeReceived.length) {
      for (const id of mate.usersLikeReceived) {
        if (swiped >= mate.profilesPerDay) {
          break;
        }
        const potentialMatch = availableMates.find((m) => m.id === id);
        const alreadyMatched = mate.alreadyMatched(id);
        if (!potentialMatch || alreadyMatched) {
          continue;
        }
        mate.swipe(potentialMatch);
        swiped++;
      }
    }

    // swipe the other profiles, starting with the least swiped
    while (swiped < mate.profilesPerDay) {
      const potentialMatch =
        availableMates[profileIdx++ % availableMates.length];
      if (mate.alreadyMatched(potentialMatch.id)) {
        // console.warn("already matched user");
        // console.log(mate, potentialMatch)
        continue;
      }
      swiped++;
      mate.swipe(potentialMatch);
    }
  });
}

function printStats({ boys, girls }: AggregateStats) {
  console.log(`Average Likes / matches for guys: ${JSON.stringify(boys)}`);
  console.log(`Average Likes / matches for girls: ${JSON.stringify(girls)}`);
}

const populationCount = 1000;

[25, 100, 250, 500, 1000].forEach((runCount) => {
  console.log(`Simulating with runs: ${runCount}`);

  const statsPerRun: AggregateStats[] = [];
  for (let i = 0; i < runCount; ++i) {
    statsPerRun.push(
      simulate({
        boys: {
          // Matches hinge gender ratios
          userCount: populationCount * 0.64,
          likeRate: 0.46,
          profilesSeenPerDay: 10,
        },
        girls: {
          userCount: populationCount * 0.36,
          likeRate: 0.14,
          profilesSeenPerDay: 10,
        },
        days: 10,
        reverse: false,
      })
    );
  }

  const aggregated: AggregateStats = statsPerRun.reduce(
    (acc, { boys, girls }) => {
      if (!acc) {
        return { boys, girls };
      }
      acc.boys.likes += boys.likes;
      acc.boys.matches += boys.matches;
      acc.girls.likes += girls.likes;
      acc.girls.matches += girls.matches;
      return acc;
    },
    undefined as unknown as AggregateStats
  );

  aggregated.boys.likes /= runCount;
  aggregated.boys.matches /= runCount;
  aggregated.girls.likes /= runCount;
  aggregated.girls.matches /= runCount;

  printStats(aggregated);
});
