import type { HealthTrack, Question } from './types.ts';

export const healthTracks: HealthTrack[] = ['Delivery & Workmanship','Client Experience & Communication','Commercial Control','Financial Control','Demand & Positioning','Capacity & Direction'];
const options = (...labels: string[]) => labels.map((label, index) => ({ value: index + 1, label }));
const q = (id: string, track: HealthTrack, prompt: string, labels: string[]): Question => ({ id, track, prompt, type: 'SINGLE_SELECT', scored: true, options: options(...labels) });

// This ordered registry is the sender contract. Context and the Q16 follow-up are collected separately and are never scored.
export const questions: Question[] = [
  q('TB-DEL-01','Delivery & Workmanship','Does finished work meet the standard you promised?',['Rarely','Sometimes','Usually','Consistently']),
  q('TB-DEL-02','Delivery & Workmanship','Do jobs finish within the agreed scope and timeframe?',['Rarely','Sometimes','Usually','Consistently']),
  q('TB-CLI-01','Client Experience & Communication','How well do you keep clients informed during a job?',['Poorly — mostly when they contact us','Inconsistently','Usually well','Very well — clients know what’s happening and what comes next']),
  q('TB-CLI-02','Client Experience & Communication','When something goes wrong, how well is it handled?',['Problems often become disputes','We tend to react after the client complains','We usually address problems quickly','We have a clear way of resolving problems and protecting the relationship']),
  q('TB-CLI-03','Client Experience & Communication','How often does completed work lead to reviews, referrals or repeat work?',['Rarely','Sometimes','Often','Very often']),
  q('TB-CLI-04','Client Experience & Communication','Do you actively ask clients for reviews?',['Never','Occasionally','Usually','Yes — it’s part of our process']),
  q('TB-COM-01','Commercial Control','How clear is the job scope before work starts?',['Often unclear','Basic scope only','Usually clear','Clearly agreed, including exclusions and responsibilities']),
  { ...q('TB-COM-02','Commercial Control','How do you normally price a job?',['Mostly experience / gut feel','Rough labour and material estimates','Detailed costing with margin / overheads','I use a QS / Quantity Surveyor']), options: [
    { value: 1, label: 'Mostly experience / gut feel' }, { value: 2, label: 'Rough labour and material estimates' },
    { value: 3, scoreValue: 4, label: 'Detailed costing with margin / overheads' }, { value: 4, scoreValue: 4, label: 'I use a QS / Quantity Surveyor' },
  ] },
  q('TB-COM-03','Commercial Control','What normally happens when extra work comes up?',['We often just do it','We discuss it but don’t always charge','We usually agree and price it first','It’s documented, priced and approved first']),
  q('TB-COM-04','Commercial Control','After a job, do you know what profit you actually made?',['No','Roughly','Usually','Yes — we compare actual costs and profit against the quote']),
  q('TB-FIN-01','Financial Control','Do deposits and progress payments stop you funding the client’s job?',['Rarely','Sometimes','Usually','Yes — payments are structured around our cash exposure']),
  { ...q('TB-FIN-02','Financial Control','How well are unexpected material costs recovered?',['We often absorb them','We recover some','We recover most','Our materials policy protects us']), options: [...options('We often absorb them','We recover some','We recover most','Our materials policy protects us'), { value: null, label: 'N/A — clients buy materials directly' }] },
  q('TB-FIN-03','Financial Control','Do you know your monthly business overheads?',['No','Roughly','Fairly accurately','Yes — and I use them when pricing and planning']),
  q('TB-DEM-01','Demand & Positioning','Do you get enough of the type of work you actually want?',['Rarely','Sometimes','Usually','Yes — we have a healthy flow of suitable work']),
  q('TB-DEM-02','Demand & Positioning','Can the right client quickly understand why they should choose you?',['Not really','We mostly look like other contractors','Our strengths are fairly clear','Yes — our difference and credibility are clear']),
  q('TB-DEM-03','Demand & Positioning','Do you know where your best enquiries come from?',['No','Roughly','Yes','Yes — and we actively focus on the sources that work']),
  q('TB-CAP-01','Capacity & Direction','What happens when you win more work?',['Things start breaking down','We cope, but delays and pressure increase','We usually handle it well','We can take on more without losing control or quality']),
  q('TB-CAP-02','Capacity & Direction','How dependent is the business on you?',['Almost everything depends on me','Most important things depend on me','The team handles much of the day-to-day','The business can operate without my constant involvement']),
  { ...q('TB-CAP-03','Capacity & Direction','Can your crew work properly without you constantly checking them?',['No','With regular supervision','Usually','Yes — responsibilities and standards are clear']), conditional: 'HAS_TEAM' },
  q('TB-CAP-04','Capacity & Direction','Are you building the business you actually want?',['No — I’m mostly reacting','I know what I want, but I’m not really building towards it','Mostly — we’re moving in the right direction','Yes — my decisions support the business I’m trying to build']),
];
export const coreQuestions = questions.filter(({ conditional }) => !conditional);
export const conditionalQuestions = questions.filter(({ conditional }) => conditional);
export const applicableQuestions = (hasTeam: boolean) => questions.filter((question) => question.conditional !== 'HAS_TEAM' || hasTeam);
