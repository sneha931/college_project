interface LoadingProps {
  text?: string;
  fullScreen?: boolean;
}

const Loading = ({ text = 'Loading...', fullScreen = false }: LoadingProps) => {
  const containerClasses = fullScreen
    ? 'min-h-screen flex items-center justify-center bg-gray-50'
    : 'flex items-center justify-center py-12';

  return (
    <div className={containerClasses}>
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
        <p className="text-gray-600 text-sm">{text}</p>
      </div>
    </div>
  );
};

export default Loading;
