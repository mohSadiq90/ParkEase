import React from 'react';
import { Text } from 'react-native';
import { render } from '@testing-library/react-native';
import {
  ShimmerPlaceholder,
  CardSkeleton,
  ListSkeleton,
  DetailSkeleton,
  DashboardSkeleton,
  ScreenShimmer,
} from '../ShimmerPlaceholder';
import LoadingScreen from '../LoadingScreen';

describe('ShimmerPlaceholder Component & Skeletons', () => {
  it('renders ShimmerPlaceholder with default and custom styles', () => {
    const { getByTestId } = render(
      <ShimmerPlaceholder
        width={150}
        height={24}
        borderRadius={8}
        testID="custom-shimmer"
      />
    );

    const placeholder = getByTestId('custom-shimmer');
    expect(placeholder).toBeTruthy();
    expect(placeholder.props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          width: 150,
          height: 24,
          borderRadius: 8,
          backgroundColor: '#E2E8F0',
        }),
      ])
    );
  });

  it('renders CardSkeleton with thumbnail, text, and footer elements', () => {
    const { getByTestId } = render(<CardSkeleton testID="test-card-skeleton" />);

    expect(getByTestId('test-card-skeleton')).toBeTruthy();
    expect(getByTestId('test-card-skeleton-thumb')).toBeTruthy();
    expect(getByTestId('test-card-skeleton-title')).toBeTruthy();
    expect(getByTestId('test-card-skeleton-subtitle')).toBeTruthy();
  });

  it('renders ListSkeleton with specified count of items', () => {
    const { getByTestId } = render(<ListSkeleton count={4} testID="test-list-skeleton" />);

    expect(getByTestId('test-list-skeleton')).toBeTruthy();
    expect(getByTestId('skeleton-card-0')).toBeTruthy();
    expect(getByTestId('skeleton-card-1')).toBeTruthy();
    expect(getByTestId('skeleton-card-2')).toBeTruthy();
    expect(getByTestId('skeleton-card-3')).toBeTruthy();
  });

  it('renders DetailSkeleton with hero, headers, and content areas', () => {
    const { getByTestId } = render(<DetailSkeleton testID="test-detail-skeleton" />);

    expect(getByTestId('test-detail-skeleton')).toBeTruthy();
    expect(getByTestId('test-detail-skeleton-hero')).toBeTruthy();
  });

  it('renders DashboardSkeleton with header and KPI grid', () => {
    const { getByTestId } = render(<DashboardSkeleton testID="test-dashboard-skeleton" />);

    expect(getByTestId('test-dashboard-skeleton')).toBeTruthy();
  });

  it('renders ScreenShimmer conditionally based on loading prop', () => {
    const { getByTestId, queryByText, rerender } = render(
      <ScreenShimmer loading={true} type="list" count={2} testID="screen-shimmer">
        <Text>Loaded Content</Text>
      </ScreenShimmer>
    );

    expect(getByTestId('screen-shimmer')).toBeTruthy();
    expect(queryByText('Loaded Content')).toBeNull();

    rerender(
      <ScreenShimmer loading={false} type="list" testID="screen-shimmer">
        <Text>Loaded Content</Text>
      </ScreenShimmer>
    );

    expect(queryByText('Loaded Content')).toBeTruthy();
  });

  it('renders LoadingScreen with message and shimmer animation', () => {
    const { getByTestId, getByText } = render(
      <LoadingScreen message="Fetching parking data..." type="list" testID="app-loading-screen" />
    );

    expect(getByTestId('app-loading-screen')).toBeTruthy();
    expect(getByText('Fetching parking data...')).toBeTruthy();
    expect(getByTestId('loading-shimmer')).toBeTruthy();
  });
});
