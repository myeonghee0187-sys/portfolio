import './Contact.css'

/** Anchor destination only. The final Contact composition will be supplied separately. */
export default function Contact() {
  return (
    <section id="contact" className="contact" aria-labelledby="contact-title">
      <div>
        <h2 id="contact-title">CONTACT</h2>
        <a href="mailto:myeonghee0187@gmail.com">myeonghee0187@gmail.com</a>
        <a href="https://github.com/myeonghee0187-sys" target="_blank" rel="noopener noreferrer">GitHub</a>
      </div>
    </section>
  )
}
