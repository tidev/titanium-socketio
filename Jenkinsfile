#! groovy
library 'pipeline-library'

def nodeVersion = '8.9.1'
def sdkVersion = '7.5.0.GA'
def androidAPILevel = '25'
def androidBuildToolsVersion = '25.0.03'

timestamps {
  node {
    stage("Checkout") {
      checkout([
        $class: 'GitSCM',
        branches: scm.branches,
        extensions: scm.extensions + [[$class: 'CleanBeforeCheckout']],
        userRemoteConfigs: scm.userRemoteConfigs
      ])
    }
  }
  stage("Build & Test") {
    parallel([
      failFast: true,
      Android: node('android-sdk && android-ndk && osx') {
        nodejs(nodeJSInstallationName: "node ${nodeVersion}") {
          def ndkName = "ANDROID_NDK_${androidNDKLevel.toUpperCase()}"

          // We have to hack to make sure we pick up correct ANDROID_SDK/NDK values from the node that's currently running this section of the build.
          def androidSDK = env.ANDROID_SDK // default to what's in env (may have come from jenkins env vars set on initial node)
          def androidNDK = env.ANDROID_NDK_R12B
          withEnv(['ANDROID_SDK=', "${ndkName}="]) {
            try {
              androidSDK = sh(returnStdout: true, script: 'printenv ANDROID_SDK').trim()
            } catch (e) {
              // squash, env var not set at OS-level
            }
            try {
              androidNDK = sh(returnStdout: true, script: "printenv ${ndkName}").trim()
            } catch (e) {
              // squash, env var not set at OS-level
            }

            dir('android') {
              // FIXME We should have a module clean command!
              // manually clean
              sh 'rm -rf build/'
              sh 'rm -rf dist/'
              sh 'rm -rf libs/'

              sh "ti config android.sdkPath ${androidSDK}"
              sh "ti config android.ndkPath ${androidNDK}"
              sh "ti config android.buildTools.selectedVersion ${androidBuildToolsVersion}"

              sh 'npm run test:android'

              dir('dist') {
                archiveArtifacts '*.zip'
              }
            }
          }
        }
      },
      iOS: node('osx && xcode') {
        nodejs(nodeJSInstallationName: "node ${nodeVersion}") {
          dir('ios') {
            sh 'sed -i \".bak\" \"s/^TITANIUM_SDK_VERSION.*/TITANIUM_SDK_VERSION=`ti sdk list -o json | node -e \'console.log(JSON.parse(require(\"fs\").readFileSync(\"/dev/stdin\")).activeSDK)\'`/\" titanium.xcconfig'

            sh 'rm -rf build/'
            sh 'rm -rf *-iphone-*.zip'
            sh 'rm -rf metadata.json'

            sh 'carthage update --platform ios'
            sh 'cp -R Carthage/Build/iOS/*.framework platform'

            sh 'npm run test:ios'

            dir('dist') {
              archiveArtifacts '*.zip'
            }
            archiveArtifacts '*.zip'
          }
        }
      }
    ])
  }
}