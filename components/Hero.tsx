export function Hero() {
  return (
    <section className="bg-gradient-to-r from-primary-600 to-secondary-600 text-white">
      <div className="container-custom py-16">
        <div className="text-center">
          <h1 className="text-4xl md:text-6xl font-bold font-display mb-6">
            Tamil Song Lyrics
          </h1>
          <p className="text-xl md:text-2xl mb-8 text-primary-100">
            Discover the latest Tamil songs with lyrics and translations
          </p>
          <p className="text-lg mb-8 text-primary-200 max-w-2xl mx-auto">
            Your ultimate destination for Tamil music. Find the latest song lyrics, 
            discover new artists, and enjoy the beauty of Tamil poetry.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button className="bg-white text-primary-600 font-semibold py-3 px-8 rounded-lg hover:bg-gray-100 transition-colors">
              Explore Latest Songs
            </button>
            <button className="border-2 border-white text-white font-semibold py-3 px-8 rounded-lg hover:bg-white hover:text-primary-600 transition-colors">
              Subscribe for Updates
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}
