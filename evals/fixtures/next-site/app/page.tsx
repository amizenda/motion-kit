const plans = [
  { name: 'Free', price: '£0', perks: ['3 habits', 'Weekly stickers'] },
  { name: 'Family', price: '£4.99', perks: ['Unlimited habits', 'Up to 4 kids', 'Reward shop'], featured: true },
  { name: 'School', price: '£49', perks: ['30 pupils', 'Teacher dashboard', 'Printable charts'] },
];

const reviews = [
  { quote: 'My son brushes his teeth without being asked. Witchcraft.', name: 'Aisha, mum of two' },
  { quote: 'The sticker sounds are the best part of our mornings.', name: 'Dan' },
  { quote: 'We use it in class every day — the kids love the streaks.', name: 'Ms Rivera, Year 2' },
  { quote: 'Finally screen time that builds good habits.', name: 'Lena' },
  { quote: 'Simple enough for my 5-year-old to use alone.', name: 'Marco' },
  { quote: 'Bedtime used to be a battle. Not any more.', name: 'Priya' },
];

export default function Home() {
  return (
    <main>
      <section className="hero">
        <h1>Tiny habits.<br />Big smiles.</h1>
        <p>Pebble turns brushing teeth, reading and tidying up into a game kids actually want to play.</p>
        <a className="btn" href="#pricing">Try it free</a>
      </section>

      <section className="features">
        <h2>How it works</h2>
        <ul>
          <li><h3>Pick a habit</h3><p>Choose from 60 kid-friendly routines.</p></li>
          <li><h3>Earn pebbles</h3><p>Every tick drops a pebble in the jar.</p></li>
          <li><h3>Spend them</h3><p>Swap pebbles for rewards you set.</p></li>
        </ul>
      </section>

      <section className="pricing" id="pricing">
        <h2>Simple pricing</h2>
        <div className="plans">
          {plans.map((p) => (
            <article key={p.name} className={p.featured ? 'plan plan--featured' : 'plan'}>
              <h3>{p.name}</h3>
              <p className="price">{p.price}<span>/month</span></p>
              <ul>{p.perks.map((perk) => <li key={perk}>{perk}</li>)}</ul>
              <a className="btn" href="#signup">Choose {p.name}</a>
            </article>
          ))}
        </div>
      </section>

      <section className="testimonials">
        <h2>Parents and teachers love it</h2>
        <div className="reviews">
          {reviews.map((r) => (
            <figure key={r.name} className="review">
              <blockquote>{r.quote}</blockquote>
              <figcaption>{r.name}</figcaption>
            </figure>
          ))}
        </div>
      </section>

      <footer className="footer"><p>© Pebble Labs</p></footer>
    </main>
  );
}
