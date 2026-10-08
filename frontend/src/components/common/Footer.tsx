export default function Footer() {
  return (
    <footer className="bg-white border-t border-gray-200 mt-auto">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="flex items-center space-x-2 mb-4 md:mb-0">
            <span className="text-xl">🎫</span>
            <span className="font-bold text-primary-600">EventEase</span>
          </div>
          <p className="text-sm text-gray-500">
            © {new Date().getFullYear()} EventEase. Buy university event tickets online.
          </p>
        </div>
      </div>
    </footer>
  );
}