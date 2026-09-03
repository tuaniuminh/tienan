Pod::Spec.new do |s|
  s.name = 'CapacitorIpaDownloader'
  s.version = '1.0.0'
  s.summary = 'Capacitor plugin for in-app IPA download with progress and iOS Share Sheet opening'
  s.license = 'MIT'
  s.homepage = 'https://github.com/tuaniuminh/tienan'
  s.author = 'tuaniuminh'
  s.source = { :git => '' }
  s.source_files = 'ios/Sources/**/*.{swift,h,m,c,cc,mm,cpp}'
  s.ios.deployment_target = '13.0'
  s.dependency 'Capacitor'
  s.swift_version = '5.1'
end
